import { handleUpload } from '@vercel/blob/client'
import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { objectIdFromString } from '@/infra/db/content-db'
import {
  CHAT_ASSET_ALLOWED_MIME_TYPES,
  CHAT_ASSET_MAX_BYTES,
  CHAT_ASSET_TOKEN_VALID_MINUTES,
} from '@/server/chat-assets/constants'
import { buildChatAssetPathname } from '@/server/chat-assets/pathname'
import { requireUser } from '@/server/auth/api-auth'
import {
  completeUploadSession,
  openUploadSession,
  resolveDefaultTenantId,
} from '@/server/services/upload-sessions'

const ClientPayloadSchema = z.object({
  originalFilename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  size: z.number().positive(),
  purpose: z.enum(['chat-media']).default('chat-media'),
})

export async function POST(request: NextRequest) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const ownerId = auth.value.id

  try {
    const ownerObjectId = objectIdFromString(ownerId)
    if (!(ownerObjectId instanceof ObjectId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
    }
    const tenantObjectId = await resolveDefaultTenantId()

    const result = await handleUpload({
      request,
      body: await request.json(),
      onBeforeGenerateToken: async (_pathname, rawPayload) => {
        const payload = ClientPayloadSchema.parse(JSON.parse(rawPayload || '{}'))
        if (payload.size > CHAT_ASSET_MAX_BYTES) throw new Error('File size exceeds maximum')
        if (
          !CHAT_ASSET_ALLOWED_MIME_TYPES.includes(
            payload.contentType as (typeof CHAT_ASSET_ALLOWED_MIME_TYPES)[number],
          )
        ) {
          throw new Error(`Content type ${payload.contentType} is not allowed`)
        }

        const expiresAt = new Date(Date.now() + CHAT_ASSET_TOKEN_VALID_MINUTES * 60 * 1000)

        // Pre-generate the session `_id` so the pathname (which embeds it) can
        // be computed before the insert. The Admin schema marks `pathname` as
        // required, so a two-step insert-then-update fails validation.
        const sessionId = new ObjectId()
        const pathname = buildChatAssetPathname({
          tenantId: tenantObjectId.toString(),
          userId: ownerId,
          uploadSessionId: sessionId.toString(),
          filename: payload.originalFilename,
        })

        await openUploadSession({
          _id: sessionId,
          tenant: tenantObjectId,
          createdBy: ownerObjectId,
          purpose: payload.purpose,
          originalFilename: payload.originalFilename,
          mimeType: payload.contentType,
          expectedSize: payload.size,
          pathname,
          expiresAt,
        })

        return {
          allowedContentTypes: [payload.contentType],
          maximumSizeInBytes: CHAT_ASSET_MAX_BYTES,
          validUntil: expiresAt.getTime(),
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24,
          tokenPayload: JSON.stringify({
            uploadSessionId: sessionId.toString(),
            tenantId: tenantObjectId.toString(),
            userId: ownerId,
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload || '{}') as { uploadSessionId?: string }
        if (!payload.uploadSessionId) return
        await completeUploadSession(payload.uploadSessionId, blob)
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    // Surface the real error to the client so upload failures are debuggable
    // instead of returning Vercel's opaque empty 500 shell.
    const message = error instanceof Error ? error.message : String(error)
    const name = error instanceof Error ? error.name : 'Error'
    return NextResponse.json(
      { error: 'Upload token request failed', name, message },
      { status: 500 },
    )
  }
}

import { head } from '@vercel/blob'
import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import {
  CHAT_ASSET_ALLOWED_MIME_TYPES,
  CHAT_ASSET_MAX_BYTES,
  CHAT_ASSET_RETENTION_DAYS,
} from '@/server/chat-assets/constants'
import { objectIdFromString, serializeDoc } from '@/infra/db/content-db'
import { createChatAsset, findChatAssetById } from '@/server/services/chat-assets'
import {
  finalizeUploadSession,
  findOwnUploadSessionByBlob,
  findUploadSessionById,
} from '@/server/services/upload-sessions'
import { requireUser } from '@/server/auth/api-auth'

const BodySchema = z
  .object({
    uploadSessionId: z.string().optional(),
    blobUrl: z.string().url().optional(),
    originalFilename: z.string().max(255).optional(),
  })
  .refine((body) => body.uploadSessionId || body.blobUrl)
  .refine((body) => !body.uploadSessionId || ObjectId.isValid(body.uploadSessionId), {
    message: 'uploadSessionId is not a valid ObjectId',
  })

const BLOB_HOST_SUFFIX = '.blob.vercel-storage.com'

/**
 * Only Vercel Blob URLs may be stored as a chat asset URL. Anything stored here
 * is later fetched by the server when the asset is attached to a chat message.
 */
export function isBlobStorageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.endsWith(BLOB_HOST_SUFFIX)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const ownerId = auth.value.id
  const { uploadSessionId, blobUrl, originalFilename } = parsed.data

  let session = uploadSessionId ? await findUploadSessionById(uploadSessionId) : null

  // Resolve by blobUrl only within the caller's own sessions. Matching on
  // blobUrl alone would let one user finalize another user's upload session.
  if (!session && blobUrl) {
    session = await findOwnUploadSessionByBlob(ownerId, blobUrl, originalFilename)
  }

  if (!session) return Response.json({ error: 'Upload session not found' }, { status: 404 })
  // createdBy is stored as ObjectId under the Admin schema, but legacy rows
  // may still be strings. Compare via string form so both round-trip.
  if (String(session.createdBy) !== ownerId)
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  if (session.status === 'finalized' && session.chatAssetId) {
    const existing = await findChatAssetById(String(session.chatAssetId))
    if (existing) {
      return NextResponse.json({
        chatAssetId: existing._id.toString(),
        chatAsset: serializeDoc(existing),
      })
    }
  }

  // Prefer the URL the Blob store reported via `onUploadCompleted`. That
  // callback cannot reach localhost, so a client-supplied URL is still accepted
  // in dev — but only after host validation: this URL is fetched server-side
  // when the asset is attached to a chat message, so an arbitrary host here
  // would be an SSRF primitive.
  const resolvedUrl = String(session.blobUrl || blobUrl || '')
  if (!resolvedUrl) return Response.json({ error: 'Upload not completed' }, { status: 409 })
  if (!isBlobStorageUrl(resolvedUrl)) {
    return Response.json({ error: 'Upload URL is not an allowed blob URL' }, { status: 400 })
  }

  let size = Number(session.expectedSize || 0)
  let mimeType = String(session.mimeType || '')
  try {
    const meta = await head(resolvedUrl)
    size = meta.size || size
    mimeType = meta.contentType || mimeType
  } catch {
    // Blob metadata can lag briefly after upload; keep session values.
  }

  if (size > CHAT_ASSET_MAX_BYTES)
    return Response.json({ error: 'File size exceeds maximum' }, { status: 413 })
  if (
    mimeType &&
    !CHAT_ASSET_ALLOWED_MIME_TYPES.includes(
      mimeType as (typeof CHAT_ASSET_ALLOWED_MIME_TYPES)[number],
    )
  ) {
    return Response.json({ error: 'Content type not allowed' }, { status: 415 })
  }

  const tenantValue = session.tenant
  if (!(tenantValue instanceof ObjectId)) {
    return Response.json({ error: 'Upload session missing tenant' }, { status: 500 })
  }
  const createdByValue = session.createdBy
  const createdBy =
    createdByValue instanceof ObjectId ? createdByValue : objectIdFromString(ownerId)
  if (!(createdBy instanceof ObjectId)) {
    return Response.json({ error: 'Invalid owner id' }, { status: 400 })
  }

  const asset = await createChatAsset({
    tenant: tenantValue,
    createdBy,
    url: resolvedUrl,
    pathname: String(session.pathname),
    originalFilename: String(session.originalFilename || originalFilename || ''),
    mimeType,
    filesize: size,
    expiresAt: new Date(Date.now() + CHAT_ASSET_RETENTION_DAYS * 24 * 60 * 60 * 1000),
    uploadSessionId: session._id.toString(),
  })

  await finalizeUploadSession(session._id, { chatAssetId: asset.id, blobUrl: resolvedUrl })

  return NextResponse.json({ chatAssetId: asset.id, chatAsset: serializeDoc(asset.doc) })
}

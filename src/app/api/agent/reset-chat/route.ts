import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { resetConversation } from '@/server/web-api/chat'
import {
  getOrCreateGuestId,
  getWebUser,
  publicUserId,
  withGuestCookie,
} from '@/infra/web-api/mongo-payload'

const BodySchema = z.object({ contextKey: z.string().min(1) })

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const guestId = getOrCreateGuestId(request)
  const user = await getWebUser(request.headers)
  const ownerId = publicUserId(user, guestId)
  const conversation = await resetConversation(ownerId, parsed.data.contextKey)
  return withGuestCookie(
    NextResponse.json({
      success: true,
      conversationId: conversation.id,
      contextKey: parsed.data.contextKey,
      isGuestMode: !user,
    }),
    guestId,
  )
}

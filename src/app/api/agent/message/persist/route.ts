import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { appendMessage, getOrCreateConversation } from '@/server/web-api/chat'
import {
  getOrCreateGuestId,
  getWebUser,
  publicUserId,
  withGuestCookie,
} from '@/infra/web-api/mongo-payload'

const BodySchema = z.object({ contextKey: z.string().min(1), content: z.string().min(1) })

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const guestId = getOrCreateGuestId(request)
  const user = await getWebUser(request.headers)
  const conversation = await getOrCreateConversation(
    publicUserId(user, guestId),
    parsed.data.contextKey,
  )
  await appendMessage(String(conversation.id), { role: 'assistant', content: parsed.data.content })
  return withGuestCookie(NextResponse.json({ success: true }), guestId)
}

import { NextRequest } from 'next/server'

import { rateLimit, rateLimitExceededResponse } from '@/infra/security/rate-limit'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { notebookPageUpdateSchema } from '@/server/api/schemas'
import { deleteNotebookPage, updateNotebookPage } from '@/server/services/notebook-pages'

interface RouteParams {
  params: Promise<{ pageId: string }>
}

/** The notebook autosaves about once a second while the student writes; this leaves headroom for that. */
const WRITE_LIMIT = { limit: 240, windowMs: 60_000 }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const rate = await rateLimit({ key: `notebook-write:${user.id}`, ...WRITE_LIMIT })
  if (!rate.allowed) return rateLimitExceededResponse(rate)

  const parsed = notebookPageUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { pageId } = await params
  const updatedAt = await updateNotebookPage(user.id, pageId, parsed.data)
  if (!updatedAt) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({ success: true, updatedAt })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { pageId } = await params
  const deleted = await deleteNotebookPage(user.id, pageId)
  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({ success: true })
}

import { NextRequest } from 'next/server'

import { rateLimit, rateLimitExceededResponse } from '@/infra/security/rate-limit'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { notebookListQuerySchema, notebookPageCreateSchema } from '@/server/api/schemas'
import { createNotebookPage, listNotebookPages } from '@/server/services/notebook-pages'

/** Page creation is a deliberate action (a cut or "blank page"), so this is far above honest use. */
const CREATE_LIMIT = { limit: 60, windowMs: 60_000 }

export async function GET(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const parsed = notebookListQuerySchema.safeParse({
    lessonId: params.get('lessonId') ?? undefined,
    askContext: params.get('askContext') ?? undefined,
  })
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const pages = await listNotebookPages(user.id, parsed.data.scope)
  return Response.json({ pages })
}

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const rate = await rateLimit({ key: `notebook-create:${user.id}`, ...CREATE_LIMIT })
  if (!rate.allowed) return rateLimitExceededResponse(rate)

  const parsed = notebookPageCreateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const result = await createNotebookPage(user.id, parsed.data)
  if (!result.ok) return Response.json({ error: 'Page limit reached' }, { status: 409 })

  return Response.json({ page: result.page }, { status: 201 })
}

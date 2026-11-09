import { randomUUID } from 'crypto'

import { type NextRequest, NextResponse } from 'next/server'

import { AccountRole } from '@/infra/auth/roles'
import { logger } from '@/infra/utils/logger'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { notebookCheckSchema } from '@/server/api/schemas'
import { runNotebookCheck } from '@/server/services/notebook-check/notebook-check'
import { caughtTutorChatError, tutorChatErrorResponse } from '@/server/services/tutor-chat/http'

export async function POST(request: NextRequest) {
  const traceId = randomUUID()
  try {
    const user = await getWebUser(request.headers)
    if (!user?.id) return tutorChatErrorResponse('auth_required', { traceId })

    const parsed = notebookCheckSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return tutorChatErrorResponse('invalid_request', { traceId })

    const result = await runNotebookCheck({
      ...parsed.data,
      ownerId: String(user.id),
      includeDebug: user.role === AccountRole.Admin,
      traceId,
      signal: request.signal,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    logger.error({ err: error, traceId }, 'Notebook check failed')
    return caughtTutorChatError(error, traceId)
  }
}

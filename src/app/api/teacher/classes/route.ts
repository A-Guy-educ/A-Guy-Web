import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { createRequestLogger } from '@/infra/utils/logger/logger'
import {
  canUseTeacherDashboard,
  toTeacherViewer,
} from '@/server/services/teacher-dashboard/teacher-class-access'
import { listTeacherClasses } from '@/server/services/teacher-dashboard/teacher-classes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const headers = { 'Cache-Control': 'no-store', 'x-request-id': requestId }
  const log = createRequestLogger(requestId)
  const user = await getWebUser(request.headers)

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  // The DB doesn't enforce classes.teachers membership, so the role gate is ours.
  if (!canUseTeacherDashboard(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers })
  }

  try {
    const classes = await listTeacherClasses(toTeacherViewer(user))
    return NextResponse.json({ classes }, { headers })
  } catch (error) {
    log.error(
      { err: error instanceof Error ? { message: error.message, stack: error.stack } : error },
      'teacher-classes: failed to list classes',
    )
    return NextResponse.json({ error: 'Failed to load classes' }, { status: 500, headers })
  }
}

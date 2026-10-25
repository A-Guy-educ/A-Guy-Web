import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { createRequestLogger } from '@/infra/utils/logger/logger'
import {
  canUseTeacherDashboard,
  toTeacherViewer,
} from '@/server/services/teacher-dashboard/teacher-class-access'
import { getClassProgressForViewer } from '@/server/services/teacher-dashboard/teacher-classes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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

  const { id } = await params

  try {
    // null = missing class OR viewer isn't one of its teachers; both are 404
    // so class ids can't be probed.
    const progress = await getClassProgressForViewer(toTeacherViewer(user), id)
    if (!progress) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
    }
    return NextResponse.json(progress, { headers })
  } catch (error) {
    log.error(
      {
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        classId: id,
      },
      'teacher-class-progress: failed to load progress',
    )
    return NextResponse.json({ error: 'Failed to load class progress' }, { status: 500, headers })
  }
}

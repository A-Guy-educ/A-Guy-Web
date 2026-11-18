import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { createRequestLogger } from '@/infra/utils/logger/logger'
import {
  canUseTeacherDashboard,
  toTeacherViewer,
} from '@/server/services/teacher-dashboard/teacher-class-access'
import { setClassLessonHidden } from '@/server/services/teacher-dashboard/teacher-classes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({ hidden: z.boolean() })

/** Hide (`{ hidden: true }`) or show one lesson of the class's course to its students. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> },
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

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Expected { hidden: boolean }' }, { status: 400, headers })
  }

  const { id, lessonId } = await params

  try {
    // false = missing class, not the viewer's class, or a lesson outside its course;
    // all 404 so ids can't be probed.
    const updated = await setClassLessonHidden(
      toTeacherViewer(user),
      id,
      lessonId,
      parsed.data.hidden,
    )
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
    }
    return NextResponse.json({ lessonId, hidden: parsed.data.hidden }, { headers })
  } catch (error) {
    log.error(
      {
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        classId: id,
        lessonId,
      },
      'teacher-lesson-visibility: failed to update',
    )
    return NextResponse.json(
      { error: 'Failed to update lesson visibility' },
      { status: 500, headers },
    )
  }
}

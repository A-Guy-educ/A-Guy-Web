/**
 * POST /api/join/enroll — adds the signed-in student to a class picked on
 * /join and returns the class's course page. 401 sends the client through
 * Google sign-in first.
 *
 * @fileType api-route
 * @domain classroom
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { createRequestLogger } from '@/infra/utils/logger/logger'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { enrollStudentInClass } from '@/server/services/classroom/class-enrollment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({ classId: z.string().min(1).max(64) })

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const headers = { 'Cache-Control': 'no-store', 'x-request-id': requestId }
  const log = createRequestLogger(requestId)
  const user = await getWebUser(request.headers)

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers })
  }

  try {
    const result = await enrollStudentInClass(String(user.id), parsed.data.classId)
    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Class not found' }, { status: 404, headers })
    }
    const courseHref = `/courses/${encodeURIComponent(result.courseSlug)}`
    return NextResponse.json({ courseHref }, { headers })
  } catch (error) {
    log.error(
      { err: error instanceof Error ? { message: error.message, stack: error.stack } : error },
      'join-enroll: failed to enroll student',
    )
    return NextResponse.json({ error: 'Failed to join class' }, { status: 500, headers })
  }
}

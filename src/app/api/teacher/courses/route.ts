import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { AccountRole } from '@/infra/auth/roles'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { createRequestLogger } from '@/infra/utils/logger/logger'
import { listManagedCourses } from '@/server/services/course-management-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COURSE_MANAGER_ROLES = new Set<string>([AccountRole.Admin, AccountRole.AdvancedContentEditor])

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const log = createRequestLogger(requestId)
  const user = await getWebUser(request.headers)

  if (!user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId } },
    )
  }

  if (!COURSE_MANAGER_ROLES.has(String(user.role))) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId } },
    )
  }

  try {
    const docs = await listManagedCourses()
    log.info({ courseCount: docs.length, userId: user.id }, 'teacher-courses: listed courses')

    return NextResponse.json(
      { docs },
      { headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId } },
    )
  } catch (error) {
    log.error(
      { err: error instanceof Error ? { message: error.message, stack: error.stack } : error },
      'teacher-courses: failed to list courses',
    )
    return NextResponse.json(
      { error: 'Failed to load courses' },
      { status: 500, headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId } },
    )
  }
}

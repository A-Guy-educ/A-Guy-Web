/**
 * @fileType api-route
 * @domain debug
 * @ai-summary Admin-only. Thin wrapper over
 * `diagnoseLessonContext(lessonId)` so we can hit it from a browser while
 * triaging "wrong PDF reaches the model" bugs. All DB access lives in the
 * service — see docs/architecture/DATA-ACCESS.md.
 */

import { NextRequest, NextResponse } from 'next/server'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { diagnoseLessonContext } from '@/server/services/debug/lesson-context-diagnostic'

export async function GET(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin' && !user.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const lessonId = request.nextUrl.searchParams.get('lessonId') ?? ''
  const result = await diagnoseLessonContext(lessonId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}

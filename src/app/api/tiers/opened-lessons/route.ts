import { NextRequest, NextResponse } from 'next/server'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { EMPTY_OPENED_LESSONS } from '@/lib/tiers'
import { getOpenedLessonIds } from '@/server/services/tier-lesson-access'

/**
 * Opened-lesson ids per lesson type for the current user + gradeLevel, used
 * by lesson lists to render tier-locked rows. Anonymous callers get empty
 * lists (nothing counted yet); the lesson page enforces the gate server-side.
 */
export async function GET(request: NextRequest) {
  const gradeLevel = request.nextUrl.searchParams.get('gradeLevel')
  if (!gradeLevel) return NextResponse.json({ error: 'gradeLevel is required' }, { status: 400 })

  const user = await getWebUser(request.headers)
  if (!user?.id) return NextResponse.json({ success: true, data: EMPTY_OPENED_LESSONS })

  const data = await getOpenedLessonIds(user.id, gradeLevel)
  return NextResponse.json({ success: true, data })
}

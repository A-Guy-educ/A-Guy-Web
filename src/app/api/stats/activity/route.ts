import { NextRequest, NextResponse } from 'next/server'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { getOrCreateUserStats } from '@/server/web-api/progress'

export async function GET(request: NextRequest) {
  const user = await getWebUser(request.headers)
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 10), 50)
  if (!user?.id) return NextResponse.json({ activities: [] })

  const stats = await getOrCreateUserStats(user.id)
  const activityLog = Array.isArray(stats?.activityLog) ? stats.activityLog : []
  return NextResponse.json({
    activities: activityLog.slice(0, limit),
    activity: activityLog.slice(0, limit),
  })
}

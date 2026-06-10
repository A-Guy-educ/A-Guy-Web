import { NextRequest, NextResponse } from 'next/server'

import { getContentDb } from '@/infra/db/content-db'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { getOrCreateUserStats } from '@/server/web-api/progress'

function ymd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return NextResponse.json({ streak: 0 })
  const stats = await getOrCreateUserStats(user.id)
  return NextResponse.json({
    streak: Number(stats?.currentStreak || 0),
    currentStreak: Number(stats?.currentStreak || 0),
    longestStreak: Number(stats?.longestStreak || 0),
  })
}

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const today = ymd(new Date())
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = ymd(yesterdayDate)
  const stats = await getOrCreateUserStats(user.id)

  if (stats?.lastActiveDate === today) {
    return Response.json({
      success: true,
      currentStreak: Number(stats.currentStreak || 0),
      longestStreak: Number(stats.longestStreak || 0),
    })
  }

  const currentStreak =
    stats?.lastActiveDate === yesterday ? Number(stats.currentStreak || 0) + 1 : 1
  const longestStreak = Math.max(Number(stats?.longestStreak || 0), currentStreak)
  const db = await getContentDb()
  await db.collection('user-stats').updateOne(
    { _id: stats?._id },
    {
      $set: {
        currentStreak,
        longestStreak,
        lastActiveDate: today,
        updatedAt: new Date(),
      },
    },
  )

  return Response.json({ success: true, currentStreak, longestStreak })
}

/**
 * Admin Dashboard Metrics API
 *
 * GET /api/admin/dashboard-metrics
 * Returns user statistics and content counts for admin dashboard widgets.
 * Admin-only — returns 403 for non-admin users.
 */

import { getPayload } from 'payload'

import config from '@payload-config'

interface UserMetrics {
  activeUsersToday: number
  activeUsersYesterday: number
  registeredYesterday: number
  registeredThisWeek: number
  registeredLastWeek: number
  registeredThisMonth: number
  registeredLastMonth: number
}

interface ContentCounts {
  courses: number
  lessons: number
  exercises: number
  formulaSheets: number
  prompts: number
}

export interface DashboardMetricsResponse {
  userMetrics: UserMetrics
  contentCounts: ContentCounts
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  // Sunday-based week start
  d.setDate(d.getDate() - day)
  return d
}

function startOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(req: Request) {
  const payload = await getPayload({ config })

  const authResult = await payload.auth({ headers: req.headers })
  if (!authResult.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin role
  if (
    !('collection' in authResult.user) ||
    authResult.user.collection !== 'users' ||
    authResult.user.role !== 'admin'
  ) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0] // YYYY-MM-DD
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const todayStart = startOfDay(now)
  const yesterdayStart = startOfDay(yesterday)

  const thisWeekStart = startOfWeek(now)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = new Date(thisMonthStart)
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)

  const [
    activeToday,
    activeYesterday,
    registeredYesterday,
    registeredThisWeek,
    registeredLastWeek,
    registeredThisMonth,
    registeredLastMonth,
    coursesCount,
    lessonsCount,
    exercisesCount,
    formulaSheetsCount,
    promptsCount,
  ] = await Promise.all([
    // Active users today (lastActiveDate = today string)
    payload.find({
      collection: 'user-stats',
      where: { lastActiveDate: { equals: todayStr } },
      limit: 0,
      overrideAccess: true,
    }),
    // Active users yesterday
    payload.find({
      collection: 'user-stats',
      where: { lastActiveDate: { equals: yesterdayStr } },
      limit: 0,
      overrideAccess: true,
    }),
    // Registered yesterday
    payload.find({
      collection: 'users',
      where: {
        createdAt: {
          greater_than_equal: yesterdayStart.toISOString(),
          less_than: todayStart.toISOString(),
        },
      },
      limit: 0,
      overrideAccess: true,
    }),
    // Registered this week
    payload.find({
      collection: 'users',
      where: {
        createdAt: { greater_than_equal: thisWeekStart.toISOString() },
      },
      limit: 0,
      overrideAccess: true,
    }),
    // Registered last week
    payload.find({
      collection: 'users',
      where: {
        createdAt: {
          greater_than_equal: lastWeekStart.toISOString(),
          less_than: thisWeekStart.toISOString(),
        },
      },
      limit: 0,
      overrideAccess: true,
    }),
    // Registered this month
    payload.find({
      collection: 'users',
      where: {
        createdAt: { greater_than_equal: thisMonthStart.toISOString() },
      },
      limit: 0,
      overrideAccess: true,
    }),
    // Registered last month
    payload.find({
      collection: 'users',
      where: {
        createdAt: {
          greater_than_equal: lastMonthStart.toISOString(),
          less_than: thisMonthStart.toISOString(),
        },
      },
      limit: 0,
      overrideAccess: true,
    }),
    // Content counts
    payload.find({ collection: 'courses', limit: 0, overrideAccess: true }),
    payload.find({ collection: 'lessons', limit: 0, overrideAccess: true }),
    payload.find({ collection: 'exercises', limit: 0, overrideAccess: true }),
    payload.find({ collection: 'formula-sheets', limit: 0, overrideAccess: true }),
    payload.find({ collection: 'prompts', limit: 0, overrideAccess: true }),
  ])

  const response: DashboardMetricsResponse = {
    userMetrics: {
      activeUsersToday: activeToday.totalDocs,
      activeUsersYesterday: activeYesterday.totalDocs,
      registeredYesterday: registeredYesterday.totalDocs,
      registeredThisWeek: registeredThisWeek.totalDocs,
      registeredLastWeek: registeredLastWeek.totalDocs,
      registeredThisMonth: registeredThisMonth.totalDocs,
      registeredLastMonth: registeredLastMonth.totalDocs,
    },
    contentCounts: {
      courses: coursesCount.totalDocs,
      lessons: lessonsCount.totalDocs,
      exercises: exercisesCount.totalDocs,
      formulaSheets: formulaSheetsCount.totalDocs,
      prompts: promptsCount.totalDocs,
    },
  }

  return Response.json(response)
}

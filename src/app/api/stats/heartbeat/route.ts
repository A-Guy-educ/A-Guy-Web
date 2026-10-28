import { NextRequest } from 'next/server'
import { z } from 'zod'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { recordStudyTime } from '@/server/services/dashboard-stats'
import { LESSON_VISIT_CONTENT_TYPES, recordLessonVisitPing } from '@/server/services/lesson-visits'
import {
  findUserProgress,
  getOrCreateUserStats,
  upsertUserProgress,
  type ProgressRecord,
} from '@/server/web-api/progress'

const HEX24 = /^[a-f0-9]{24}$/i

// `seconds: 0` is a visit-only ping (lesson opened, or PDF scrolled) — it
// writes the per-visit dwell log and nothing else. Real heartbeats are
// 1-120s and still feed the legacy study-time + progressRecords counters.
const BodySchema = z
  .object({
    seconds: z.number().min(0).max(120),
    lessonId: z.string().min(1).optional(),
    visitId: z
      .string()
      .regex(/^[A-Za-z0-9-]{8,64}$/)
      .optional(),
    courseId: z.string().regex(HEX24).optional(),
    contentType: z.enum(LESSON_VISIT_CONTENT_TYPES).optional(),
    scrolled: z.boolean().optional(),
  })
  .refine((body) => body.seconds > 0 || (body.visitId && body.lessonId), {
    message: 'seconds=0 is only valid as a lesson visit ping',
  })

type HeartbeatBody = z.infer<typeof BodySchema>

async function recordLessonTime(userId: string, lessonId: string, seconds: number) {
  const gradeLevel = 'default'
  const progress = await findUserProgress(userId, gradeLevel)
  const records = [...(progress?.progressRecords ?? [])]
  const index = records.findIndex(
    (record) => record.recordType === 'lesson' && record.recordId === lessonId,
  )
  const now = new Date().toISOString()
  if (index >= 0) {
    records[index] = {
      ...records[index],
      timeSpentSeconds: (records[index].timeSpentSeconds || 0) + seconds,
      lastAccessedAt: now,
    }
  } else {
    records.push({
      recordType: 'lesson',
      recordId: lessonId,
      status: 'in_progress',
      completionPercentage: 0,
      timeSpentSeconds: seconds,
      lastAccessedAt: now,
    } satisfies ProgressRecord)
  }
  await upsertUserProgress(userId, gradeLevel, { progressRecords: records })
}

async function recordVisit(userId: string, body: HeartbeatBody) {
  if (!body.visitId || !body.lessonId) return
  await recordLessonVisitPing({
    userId,
    visitId: body.visitId,
    lessonId: body.lessonId,
    courseId: body.courseId,
    contentType: body.contentType,
    seconds: body.seconds,
    scrolled: body.scrolled ?? false,
  })
}

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  await recordVisit(user.id, parsed.data)
  if (parsed.data.seconds === 0) return Response.json({ success: true })

  const stats = await getOrCreateUserStats(user.id)
  const totalTimeSpentSeconds = Number(stats?.totalTimeSpentSeconds || 0) + parsed.data.seconds
  await recordStudyTime(stats?._id, totalTimeSpentSeconds)

  if (parsed.data.lessonId) {
    await recordLessonTime(user.id, parsed.data.lessonId, parsed.data.seconds)
  }

  return Response.json({ success: true, totalTimeSpentSeconds })
}

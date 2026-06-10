import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import {
  findUserProgress,
  upsertUserProgress,
  type ProgressRecord,
} from '@/server/web-api/progress'

const BodySchema = z.object({
  recordType: z.enum(['lesson', 'exercise', 'chapter']),
  recordId: z.string().min(1),
  completionPercentage: z.number().min(0).max(100),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  score: z.number().min(0).max(100).optional(),
  gradeLevel: z.string().min(1),
})

export async function GET(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const gradeLevel = searchParams.get('gradeLevel')
  if (!gradeLevel) return NextResponse.json({ error: 'gradeLevel is required' }, { status: 400 })

  const recordType = searchParams.get('recordType')
  const recordIds = searchParams.get('recordIds')?.split(',').filter(Boolean) ?? null
  const scope = searchParams.get('scope')
  const progress = await findUserProgress(user.id, gradeLevel)
  let records = progress?.progressRecords ?? []

  if (scope === 'course') {
    const lessons = records.filter((record) => record.recordType === 'lesson')
    const percentage = lessons.length
      ? Math.round(
          lessons.reduce((sum, record) => sum + (record.completionPercentage ?? 0), 0) /
            lessons.length,
        )
      : 0
    return NextResponse.json({
      success: true,
      data: { percentage, totalLessons: lessons.length },
    })
  }

  if (recordType) records = records.filter((record) => record.recordType === recordType)
  if (recordIds) records = records.filter((record) => recordIds.includes(record.recordId))

  const data: Record<string, { completionPercentage: number; status: string; score?: number }> = {}
  for (const record of records) {
    data[record.recordId] = {
      completionPercentage: record.completionPercentage ?? 0,
      status: record.status ?? 'not_started',
      ...(record.score != null ? { score: record.score } : {}),
    }
  }

  return NextResponse.json({ success: true, data, progressMap: data })
}

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const progress = await findUserProgress(user.id, parsed.data.gradeLevel)
  const records = [...(progress?.progressRecords ?? [])]
  const nextRecord: ProgressRecord = {
    ...parsed.data,
    lastAccessedAt: new Date().toISOString(),
  }
  const index = records.findIndex(
    (record) =>
      record.recordType === parsed.data.recordType && record.recordId === parsed.data.recordId,
  )
  if (index >= 0) records[index] = { ...records[index], ...nextRecord }
  else records.push(nextRecord)

  await upsertUserProgress(user.id, parsed.data.gradeLevel, { progressRecords: records })
  return NextResponse.json({ success: true, data: nextRecord }, { status: index >= 0 ? 200 : 201 })
}

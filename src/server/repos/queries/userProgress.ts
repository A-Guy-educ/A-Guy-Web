import { cache } from 'react'

import { findUserProgress, type ProgressRecord } from '@/server/web-api/progress'

export const queryUserProgressByGrade = cache(
  async ({ userId, gradeLevel }: { userId: string; gradeLevel: string }) =>
    findUserProgress(userId, gradeLevel),
)

export const queryChapterProgress = cache(
  async ({
    userId,
    chapterIds: _chapterIds,
    gradeLevel,
  }: {
    userId: string
    chapterIds: string[]
    gradeLevel: string
  }) => {
    const progress = await findUserProgress(userId, gradeLevel)
    const records = progress?.progressRecords ?? []
    return records
      .filter((record: ProgressRecord) => record.recordType === 'chapter')
      .reduce<Record<string, { completionPercentage: number; status: string }>>((acc, record) => {
        acc[record.recordId] = {
          completionPercentage: record.completionPercentage ?? 0,
          status: record.status ?? 'not_started',
        }
        return acc
      }, {})
  },
)

export const queryStudyPlan = cache(
  async ({
    userId,
    gradeLevel,
    courseId,
  }: {
    userId: string
    gradeLevel: string
    courseId: string
  }) => {
    const progress = await findUserProgress(userId, gradeLevel)
    const plans = Array.isArray(progress?.studyPlans) ? progress.studyPlans : []
    return (
      plans.find((plan) => {
        return Boolean(
          plan && typeof plan === 'object' && (plan as { courseId?: string }).courseId === courseId,
        )
      }) ?? null
    )
  },
)

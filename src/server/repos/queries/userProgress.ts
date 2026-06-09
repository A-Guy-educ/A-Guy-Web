import { cache } from 'react'

export const queryUserProgressByGrade = cache(
  async (_input: { userId: string; gradeLevel: string }) => null,
)

export const queryChapterProgress = cache(
  async (_input: { userId: string; chapterIds: string[]; gradeLevel: string }) => ({}),
)

export const queryStudyPlan = cache(
  async (_input: { userId: string; gradeLevel: string; courseId: string }) => null,
)

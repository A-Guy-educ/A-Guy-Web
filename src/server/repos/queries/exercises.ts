import { cache } from 'react'

import type { Exercise } from '@/infra/types/content'
import {
  findByIdSerialized,
  findManySerialized,
  findOneSerialized,
  objectIdFromString,
} from '../mongo'

export const queryExercisesByLesson = cache(async ({ lessonId }: { lessonId: string }) => {
  return findManySerialized<Exercise>(
    'exercises',
    { lesson: objectIdFromString(lessonId) },
    { sort: { order: 1, createdAt: 1 }, limit: 1000 },
  )
})

export const queryExerciseById = cache(async ({ id }: { id: string }) => {
  return findByIdSerialized<Exercise>('exercises', id)
})

export const queryExerciseBySlug = cache(
  async ({ lessonId, slug }: { lessonId: string; slug: string }) => {
    return findOneSerialized<Exercise>('exercises', {
      lesson: objectIdFromString(lessonId),
      slug,
    })
  },
)

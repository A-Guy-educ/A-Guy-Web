import type { Exercise } from '@/infra/types/content'

export function getExerciseUrlParam(exercise: Exercise): string {
  return exercise.slug || exercise.id
}

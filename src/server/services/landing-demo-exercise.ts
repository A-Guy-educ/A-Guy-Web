/**
 * Picks the real exercise the landing page lets visitors try: a free lesson
 * exercise whose only question is a single-answer multiple choice with a
 * written hint and guiding question (`solution`), ideally also a written
 * explanation (`fullSolution`), so every help button has something to show
 * without the lesson chat's AI. Exercises with images are skipped
 * (the landing has no media map). Cached for an hour — the scan reads several
 * lessons and the landing is the busiest page.
 *
 * @fileType service
 * @domain content
 */
import { unstable_cache } from 'next/cache'

import { resolveAccessType } from '@/infra/auth/access-types'
import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import type { ContentLocale } from '@/infra/types/content'
import { getExerciseBlockGroups } from '@/lib/exercises/getExerciseBlocks'
import { getEffectiveLessonType } from '@/server/constants/lesson-types'
import { queryCourseBySlugWithFallback } from '@/server/repos/queries/courses'
import { queryExercisesByLesson } from '@/server/repos/queries/exercises'
import { queryLessonsByCourse } from '@/server/repos/queries/lessons'

/** The course the demo exercise comes from; the course list is the fallback. */
const PREFERRED_COURSE_SLUG = '7th_grade_math'
const MAX_LESSONS_SCANNED = 25
const CACHE_SECONDS = 3600

export interface LandingDemoExercise {
  lessonId: string
  exerciseId: string
  groups: ExerciseBlockGroup[]
}

type LooseBlock = { type?: string; variant?: string; selectionMode?: string } & Record<
  string,
  unknown
>

/** A hint / solution is inline rich text (`{ value }`); older content may be a plain string. */
function hasText(field: unknown): boolean {
  const text =
    typeof field === 'string' ? field : (field as { value?: unknown } | null | undefined)?.value
  return typeof text === 'string' && text.trim().length > 0
}

/** Any image anywhere in the blocks: a media block, or rich text with media ids. */
function usesMedia(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(usesMedia)
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (typeof record.mediaId === 'string' && record.mediaId) return true
  if (Array.isArray(record.mediaIds) && record.mediaIds.length > 0) return true
  return Object.values(record).some(usesMedia)
}

/**
 * True when the exercise's single question is a single-answer MCQ with a hint
 * and a guiding question; `complete` also asks for the written explanation.
 */
export function isLandingDemoCandidate(groups: ExerciseBlockGroup[], complete = false): boolean {
  const blocks = groups.flatMap((group) => group.blocks) as unknown as LooseBlock[]
  const questions = blocks.filter(
    (b) => typeof b.type === 'string' && b.type.startsWith('question'),
  )
  if (questions.length !== 1) return false
  const [question] = questions
  if (question.type !== 'question_select' || question.variant !== 'mcq') return false
  if (question.selectionMode === 'multiple' || question.attachment) return false
  if (!hasText(question.hint) || !hasText(question.solution)) return false
  if (complete && !hasText(question.fullSolution)) return false
  return !usesMedia(blocks)
}

async function findLandingDemoExercise(
  locale: ContentLocale | undefined,
): Promise<LandingDemoExercise | null> {
  const { course } = await queryCourseBySlugWithFallback({ slug: PREFERRED_COURSE_SLUG, locale })
  if (!course) return null

  const lessons = (await queryLessonsByCourse({ courseId: course.id }))
    .filter((lesson) => resolveAccessType(lesson.accessType, course.accessType) === 'free')
    .filter((lesson) => getEffectiveLessonType(lesson.type) !== 'exam')
    .slice(0, MAX_LESSONS_SCANNED)

  // Prefer an exercise where all three help buttons have written content.
  let fallback: LandingDemoExercise | null = null
  for (const lesson of lessons) {
    const exercises = await queryExercisesByLesson({ lessonId: lesson.id })
    for (const exercise of exercises) {
      const groups = getExerciseBlockGroups(exercise)
      if (!isLandingDemoCandidate(groups)) continue
      const found = { lessonId: lesson.id, exerciseId: exercise.id, groups }
      if (isLandingDemoCandidate(groups, true)) return found
      fallback ??= found
    }
  }
  return fallback
}

export async function getLandingDemoExercise(
  locale: ContentLocale | undefined,
): Promise<LandingDemoExercise | null> {
  try {
    return await unstable_cache(
      () => findLandingDemoExercise(locale),
      ['landing-demo-exercise', locale ?? 'default'],
      { revalidate: CACHE_SECONDS },
    )()
  } catch (error) {
    // The landing still works without it: the slot shows its placeholder.
    console.error('Landing demo exercise lookup failed:', error)
    return null
  }
}

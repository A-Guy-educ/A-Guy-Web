/**
 * Picks the real exercise the landing page lets visitors try: an exercise
 * from a lesson that costs nothing (free, or free after sign-up) whose only question is a single-answer multiple choice, ranked by
 * how much written help it has — hint, guiding question (`solution`) and
 * explanation (`fullSolution`) — since the landing has no lesson chat to fill
 * the gaps. Looks in 7th grade math first, then the other published courses. Exercises with images are skipped
 * (the landing has no media map). Cached for an hour — the scan reads several
 * lessons and the landing is the busiest page.
 *
 * @fileType service
 * @domain content
 */
import { unstable_cache } from 'next/cache'

import { resolveAccessType, type AccessType } from '@/infra/auth/access-types'
import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import type { ContentLocale, Course } from '@/infra/types/content'
import { getExerciseBlockGroups } from '@/lib/exercises/getExerciseBlocks'
import { getEffectiveLessonType } from '@/server/constants/lesson-types'
import {
  queryCourseBySlugWithFallback,
  queryPublishedCourses,
} from '@/server/repos/queries/courses'
import { queryExercisesByLesson } from '@/server/repos/queries/exercises'
import { queryLessonsByCourse } from '@/server/repos/queries/lessons'

/** The course the demo exercise comes from; the course list is the fallback. */
const PREFERRED_COURSE_SLUG = '7th_grade_math'
/** Lessons read in total across all courses, so a sparse catalog can't make the scan run long. */
const MAX_LESSONS_SCANNED = 40
const CACHE_SECONDS = 3600
/** Content that costs nothing — `mandatory` is free after sign-up; gated / paid stay out. */
const DEMO_ACCESS_TYPES: ReadonlySet<AccessType> = new Set(['free', 'mandatory'])

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
 * How good a landing demo the exercise makes: 0 = unusable; otherwise its only
 * question is a single-answer MCQ without images, and the score counts the
 * written help — 1 hint, 2 hint + guiding question, 3 all three.
 */
export function rankLandingDemoCandidate(groups: ExerciseBlockGroup[]): number {
  const blocks = groups.flatMap((group) => group.blocks) as unknown as LooseBlock[]
  const questions = blocks.filter(
    (b) => typeof b.type === 'string' && b.type.startsWith('question'),
  )
  if (questions.length !== 1) return 0
  const [question] = questions
  if (question.type !== 'question_select' || question.variant !== 'mcq') return 0
  if (question.selectionMode === 'multiple' || question.attachment) return 0
  if (!hasText(question.hint) || usesMedia(blocks)) return 0
  if (!hasText(question.solution)) return 1
  return hasText(question.fullSolution) ? 3 : 2
}

const BEST_RANK = 3

/** The preferred course first, then the rest of the catalog in its usual order. */
async function candidateCourses(locale: ContentLocale | undefined): Promise<Course[]> {
  const { course: preferred } = await queryCourseBySlugWithFallback({
    slug: PREFERRED_COURSE_SLUG,
    locale,
  })
  const rest = (await queryPublishedCourses(locale)).filter((c) => c.id !== preferred?.id)
  return preferred ? [preferred, ...rest] : rest
}

async function findLandingDemoExercise(
  locale: ContentLocale | undefined,
): Promise<LandingDemoExercise | null> {
  let best: LandingDemoExercise | null = null
  let bestRank = 0
  let budget = MAX_LESSONS_SCANNED

  for (const course of await candidateCourses(locale)) {
    const lessons = (await queryLessonsByCourse({ courseId: course.id }))
      .filter((lesson) =>
        DEMO_ACCESS_TYPES.has(resolveAccessType(lesson.accessType, course.accessType)),
      )
      .filter((lesson) => getEffectiveLessonType(lesson.type) !== 'exam')
      .slice(0, budget)
    budget -= lessons.length

    for (const lesson of lessons) {
      for (const exercise of await queryExercisesByLesson({ lessonId: lesson.id })) {
        const groups = getExerciseBlockGroups(exercise)
        const rank = rankLandingDemoCandidate(groups)
        if (rank <= bestRank) continue
        best = { lessonId: lesson.id, exerciseId: exercise.id, groups }
        bestRank = rank
        if (rank === BEST_RANK) return best
      }
    }
    if (budget <= 0) break
  }
  return best
}

export async function getLandingDemoExercise(
  locale: ContentLocale | undefined,
): Promise<LandingDemoExercise | null> {
  try {
    return await unstable_cache(
      () => findLandingDemoExercise(locale),
      ['landing-demo-exercise-v3', locale ?? 'default'],
      { revalidate: CACHE_SECONDS },
    )()
  } catch (error) {
    // The landing still works without it: the slot shows its placeholder.
    console.error('Landing demo exercise lookup failed:', error)
    return null
  }
}

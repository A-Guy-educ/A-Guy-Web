/**
 * Picks the real question the landing page lets visitors try: a single-answer
 * multiple choice from any lesson exercise, shown on its own and ranked by
 * how much written help it has — hint, guiding question (`solution`) and
 * explanation (`fullSolution`) — since the landing has no lesson chat to fill
 * the gaps. Looks in 7th grade math first, then the other published courses,
 * whatever their access. Exercises with images are skipped (the landing has
 * no media map). Cached for an hour — the scan reads several
 * lessons and the landing is the busiest page.
 *
 * @fileType service
 * @domain content
 */
import { unstable_cache } from 'next/cache'

import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import type { ContentLocale, Course } from '@/infra/types/content'
import { getExerciseBlockGroups } from '@/lib/exercises/getExerciseBlocks'
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

const isQuestion = (block: LooseBlock) =>
  typeof block.type === 'string' && block.type.startsWith('question')

/**
 * How good a landing demo the question makes: 0 = unusable (not a single-answer
 * MCQ, no hint, or images); otherwise the written help — 1 hint, 2 hint +
 * guiding question, 3 all three.
 */
function rankQuestion(question: LooseBlock, stem: LooseBlock[]): number {
  if (question.type !== 'question_select' || question.variant !== 'mcq') return 0
  if (question.selectionMode === 'multiple' || question.attachment) return 0
  if (!hasText(question.hint) || usesMedia([stem, question])) return 0
  if (!hasText(question.solution)) return 1
  return hasText(question.fullSolution) ? 3 : 2
}

/** "**א.** …" / "1. …" — the sub-question label, meaningless once it stands alone. */
const SUB_QUESTION_LABEL = /^\s*(\*\*)?\(?[א-ת0-9]{1,2}[.)](\*\*)?\s+/

function withoutLabel(question: LooseBlock): LooseBlock {
  const prompt = question.prompt as { value?: unknown } | undefined
  if (typeof prompt?.value !== 'string') return question
  return { ...question, prompt: { ...prompt, value: prompt.value.replace(SUB_QUESTION_LABEL, '') } }
}

/**
 * The exercise's best question for the landing, alone: exercises usually hold
 * several sub-questions, so each single-answer MCQ is ranked on its own and
 * shown with the text that opens its group (the shared stem), label dropped.
 */
export function pickLandingDemoQuestion(
  groups: ExerciseBlockGroup[],
): { groups: ExerciseBlockGroup[]; rank: number } | null {
  let best: { groups: ExerciseBlockGroup[]; rank: number } | null = null
  for (const group of groups) {
    const blocks = group.blocks as unknown as LooseBlock[]
    const firstQuestion = blocks.findIndex(isQuestion)
    if (firstQuestion < 0) continue
    const stem = blocks.slice(0, firstQuestion)
    for (const question of blocks.slice(firstQuestion).filter(isQuestion)) {
      const rank = rankQuestion(question, stem)
      if (rank <= (best?.rank ?? 0)) continue
      const demoBlocks = [
        ...stem,
        withoutLabel(question),
      ] as unknown as ExerciseBlockGroup['blocks']
      best = { groups: [{ ...group, blocks: demoBlocks }], rank }
    }
  }
  return best
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
    const lessons = (await queryLessonsByCourse({ courseId: course.id })).slice(0, budget)
    budget -= lessons.length

    for (const lesson of lessons) {
      for (const exercise of await queryExercisesByLesson({ lessonId: lesson.id })) {
        const pick = pickLandingDemoQuestion(getExerciseBlockGroups(exercise))
        if (!pick || pick.rank <= bestRank) continue
        best = { lessonId: lesson.id, exerciseId: exercise.id, groups: pick.groups }
        bestRank = pick.rank
        if (bestRank === BEST_RANK) return best
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
      ['landing-demo-exercise-v5', locale ?? 'default'],
      { revalidate: CACHE_SECONDS },
    )()
  } catch (error) {
    // The landing still works without it: the slot shows its placeholder.
    console.error('Landing demo exercise lookup failed:', error)
    return null
  }
}

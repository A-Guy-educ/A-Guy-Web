import type { Exercise } from '@/infra/types/content'
import type { ContentBlock, QuestionSelectMcqBlock } from '@/infra/types/exercise'
import { getExerciseBlocks } from '@/lib/exercises/getExerciseBlocks'

export interface LessonLandingQuestion {
  id: string
  exerciseTitle: string | null
  level: string | null
  prompt: string
  options: Array<{ id: string; text: string }>
  correctOptionId: string
  hint: string | null
}

export interface LessonLandingWorkedExample {
  exerciseTitle: string | null
  prompt: string
  solution: string
  answer: string | null
}

/**
 * Everything the public lesson landing page shows that comes from the
 * lesson's exercises rather than from lesson fields.
 */
export interface LessonLandingContent {
  /** First sketch in the lesson (`svg` or `question_axis`), shown in the hero. */
  visual: ContentBlock | null
  workedExample: LessonLandingWorkedExample | null
  practice: LessonLandingQuestion[]
}

const PRACTICE_COUNT = 3
// The JSON importer prefixes prompts with the section number ("**א.** ...").
// On the landing page questions stand alone, so the prefix is noise.
const QUESTION_NUMBER_PREFIX = /^\*\*[^*\n]{1,6}\.\*\*\s*/

interface McqCandidate {
  exercise: Exercise
  block: QuestionSelectMcqBlock
}

function isSingleAnswerMcq(block: ContentBlock): block is QuestionSelectMcqBlock {
  return (
    block?.type === 'question_select' &&
    block.variant === 'mcq' &&
    Array.isArray(block.answer?.options) &&
    block.answer.options.length >= 2 &&
    block.answer.correctOptionIds?.length === 1
  )
}

function isVisual(block: ContentBlock): boolean {
  if (block?.type === 'svg') return Boolean(block.value?.trim()) && !block.interactive
  return block?.type === 'question_axis' && Boolean(block.axis)
}

function promptText(block: QuestionSelectMcqBlock): string {
  return (block.prompt?.value ?? '').replace(QUESTION_NUMBER_PREFIX, '').trim()
}

function correctOptionText(block: QuestionSelectMcqBlock): string | null {
  const [correctId] = block.answer.correctOptionIds
  return block.answer.options.find((option) => option.id === correctId)?.content?.value ?? null
}

function toQuestion({ exercise, block }: McqCandidate): LessonLandingQuestion {
  return {
    id: block.id,
    exerciseTitle: exercise.title ?? null,
    level: exercise.difficulty ?? null,
    prompt: promptText(block),
    options: block.answer.options.map((option) => ({
      id: option.id,
      text: option.content?.value ?? '',
    })),
    correctOptionId: block.answer.correctOptionIds[0],
    hint: block.hint?.value?.trim() || null,
  }
}

/** Spread picks across the lesson so practice runs easy → hard. */
function pickSpread<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items
  const last = items.length - 1
  return Array.from({ length: count }, (_, i) => items[Math.round((i * last) / (count - 1))])
}

export function buildLessonLanding(exercises: Exercise[]): LessonLandingContent {
  let visual: ContentBlock | null = null
  let workedExample: McqCandidate | null = null
  const firstMcqPerExercise: McqCandidate[] = []

  for (const exercise of exercises) {
    const blocks = getExerciseBlocks(exercise)
    visual ??= blocks.find(isVisual) ?? null

    const mcqs = blocks.filter(isSingleAnswerMcq)
    workedExample ??=
      mcqs
        .filter((block) => block.fullSolution?.value?.trim())
        .map((block) => ({ exercise, block }))[0] ?? null

    const practiceBlock = mcqs.find((block) => block.id !== workedExample?.block.id)
    if (practiceBlock) firstMcqPerExercise.push({ exercise, block: practiceBlock })
  }

  return {
    visual,
    workedExample: workedExample
      ? {
          exerciseTitle: workedExample.exercise.title ?? null,
          prompt: promptText(workedExample.block),
          solution: workedExample.block.fullSolution!.value.trim(),
          answer: correctOptionText(workedExample.block),
        }
      : null,
    practice: pickSpread(firstMcqPerExercise, PRACTICE_COUNT).map(toQuestion),
  }
}

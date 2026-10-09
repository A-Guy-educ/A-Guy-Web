// @vitest-environment jsdom
import {
  classifyLessonOutcome,
  computeLessonStats,
  computeMoneySaved,
  type LessonStats,
} from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/lessonSummary'
import type { Exercise } from '@/infra/types/content'
import { writeExerciseState } from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * Minimal exercise/section factory for the aggregator. Each section gets
 * exactly one `question_select` block so section-level outcome maps 1:1 to
 * the single block's state. Non-answer-required blocks (plain `rich_text`)
 * are added when we want to test that the aggregator skips them.
 */
function exerciseWithSections(
  id: string,
  sectionIds: string[],
  opts?: { extraDisplayOnlySection?: boolean },
): Exercise {
  const sections = sectionIds.map((sid, idx) => ({
    id: sid,
    title: `section ${sid}`,
    order: idx,
    content: {
      blocks: [
        {
          id: `${sid}-q`,
          type: 'question_select',
          variant: 'true_false',
          prompt: { type: 'rich_text', format: 'md-math-v1', value: 'q', mediaIds: [] },
          options: [
            {
              id: `${sid}-t`,
              label: { type: 'rich_text', format: 'md-math-v1', value: 'T', mediaIds: [] },
            },
            {
              id: `${sid}-f`,
              label: { type: 'rich_text', format: 'md-math-v1', value: 'F', mediaIds: [] },
            },
          ],
          answer: { correctOptionId: `${sid}-t` },
        },
      ],
    },
  }))
  // Optionally add a display-only section (rich_text only) that the
  // aggregator should skip — guards against the "intro-only group" case
  // inflating section counts.
  if (opts?.extraDisplayOnlySection) {
    sections.push({
      id: `${id}-display`,
      title: 'display-only',
      order: sections.length,
      content: {
        blocks: [
          {
            id: `${id}-display-text`,
            type: 'rich_text',
            format: 'md-math-v1',
            value: 'intro',
            mediaIds: [],
          },
        ],
      },
    } as (typeof sections)[number])
  }
  return {
    id,
    title: `exercise ${id}`,
    slug: id,
    sections,
    content: { blocks: [] },
  } as unknown as Exercise
}

function savePerBlock(
  exerciseId: string,
  blockState: Record<
    string,
    {
      isCorrect?: boolean
      wrongOptionIds?: string[]
      hintShown?: boolean
      notChecked?: boolean
    }
  >,
) {
  const checkResults: Record<string, { isCorrect: boolean }> = {}
  const hasChecked: Record<string, boolean> = {}
  const blockMeta: Record<string, Record<string, unknown>> = {}
  for (const [blockId, state] of Object.entries(blockState)) {
    if (state.isCorrect !== undefined) {
      checkResults[blockId] = { isCorrect: state.isCorrect }
      hasChecked[blockId] = true
    }
    const meta: Record<string, unknown> = {}
    if (state.wrongOptionIds) meta.wrongOptionIds = state.wrongOptionIds
    if (state.hintShown) meta.hintShown = state.hintShown
    if (state.notChecked) meta.notChecked = state.notChecked
    if (Object.keys(meta).length > 0) blockMeta[blockId] = meta
  }
  writeExerciseState(exerciseId, {
    answers: {},
    checkResults,
    hasChecked,
    svgAnswers: {},
    svgCheckResults: {},
    blockMeta: blockMeta as Record<
      string,
      { wrongOptionIds?: string[]; hintShown?: boolean; notChecked?: boolean }
    >,
  })
}

describe('computeLessonStats', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('counts a fresh (unanswered) lesson as all-skipped', () => {
    const ex = exerciseWithSections('ex1', ['s0', 's1', 's2'])
    const stats = computeLessonStats([ex])
    expect(stats).toEqual({
      totalSections: 3,
      alone: 0,
      withHelp: 0,
      skipped: 3,
      wrong: 0,
    })
  })

  it('counts correct-first-try sections as alone', () => {
    const ex = exerciseWithSections('ex1', ['s0', 's1'])
    savePerBlock('ex1', {
      's0-q': { isCorrect: true },
      's1-q': { isCorrect: true },
    })
    expect(computeLessonStats([ex])).toEqual({
      totalSections: 2,
      alone: 2,
      withHelp: 0,
      skipped: 0,
      wrong: 0,
    })
  })

  it('demotes correct sections with wrong-option retries or hint usage to with-help', () => {
    const ex = exerciseWithSections('ex1', ['s0', 's1', 's2'])
    savePerBlock('ex1', {
      's0-q': { isCorrect: true, wrongOptionIds: ['s0-f'] },
      's1-q': { isCorrect: true, hintShown: true },
      's2-q': { isCorrect: true, notChecked: true },
    })
    expect(computeLessonStats([ex])).toEqual({
      totalSections: 3,
      alone: 0,
      withHelp: 3,
      skipped: 0,
      wrong: 0,
    })
  })

  it('counts a section with any wrong block as wrong', () => {
    const ex = exerciseWithSections('ex1', ['s0'])
    savePerBlock('ex1', { 's0-q': { isCorrect: false } })
    expect(computeLessonStats([ex])).toEqual({
      totalSections: 1,
      alone: 0,
      withHelp: 0,
      skipped: 0,
      wrong: 1,
    })
  })

  it('mixes buckets across sections within a lesson', () => {
    const ex = exerciseWithSections('ex1', ['s0', 's1', 's2', 's3'])
    savePerBlock('ex1', {
      's0-q': { isCorrect: true }, // alone
      's1-q': { isCorrect: true, hintShown: true }, // withHelp
      's2-q': { isCorrect: false }, // wrong
      // s3 unanswered → skipped
    })
    expect(computeLessonStats([ex])).toEqual({
      totalSections: 4,
      alone: 1,
      withHelp: 1,
      skipped: 1,
      wrong: 1,
    })
  })
})

describe('classifyLessonOutcome', () => {
  const stats = (over: Partial<LessonStats>): LessonStats => ({
    totalSections: 40,
    alone: 28,
    withHelp: 4,
    skipped: 4,
    wrong: 4,
    ...over,
  })

  it('85%+ alone → high-independent', () => {
    expect(classifyLessonOutcome(stats({ alone: 36, withHelp: 2, skipped: 0, wrong: 2 }))).toBe(
      'high-independent',
    )
  })

  it('30%+ wrong trumps everything (except skipped-majority)', () => {
    expect(classifyLessonOutcome(stats({ alone: 10, withHelp: 8, skipped: 2, wrong: 20 }))).toBe(
      'many-mistakes',
    )
  })

  it('50%+ skipped trumps even high alone-correct counts', () => {
    expect(classifyLessonOutcome(stats({ alone: 16, withHelp: 2, skipped: 20, wrong: 2 }))).toBe(
      'many-skips',
    )
  })

  it('40%+ with-help → lots-of-help', () => {
    expect(classifyLessonOutcome(stats({ alone: 12, withHelp: 22, skipped: 2, wrong: 4 }))).toBe(
      'lots-of-help',
    )
  })

  it('70% alone with mixed buckets → good-with-difficulty (default fallback)', () => {
    expect(classifyLessonOutcome(stats({ alone: 28, withHelp: 4, skipped: 4, wrong: 4 }))).toBe(
      'good-with-difficulty',
    )
  })

  it('empty lesson → good-with-difficulty (defensive)', () => {
    expect(
      classifyLessonOutcome({
        totalSections: 0,
        alone: 0,
        withHelp: 0,
        skipped: 0,
        wrong: 0,
      }),
    ).toBe('good-with-difficulty')
  })
})

describe('computeMoneySaved', () => {
  it('free tier → full reference price saved', () => {
    expect(computeMoneySaved(0)).toBe(180)
  })

  it('basic tier (59) → 121 saved', () => {
    expect(computeMoneySaved(59)).toBe(121)
  })

  it('premium tier (239, more than one lesson) → clamps to 0, no negative display', () => {
    expect(computeMoneySaved(239)).toBe(0)
  })
})

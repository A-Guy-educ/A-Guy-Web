import { describe, expect, it } from 'vitest'

import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { pickLandingDemoQuestion } from '@/server/services/landing-demo-exercise'

const rt = (value: string) => ({ type: 'rich_text', format: 'md-math-v1', value, mediaIds: [] })

function mcq(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1',
    type: 'question_select',
    variant: 'mcq',
    selectionMode: 'single',
    prompt: rt('מה הערך של x?'),
    answer: { multiSelect: false, options: [], correctOptionIds: [] },
    hint: rt('רמז'),
    solution: rt('שאלה מנחה'),
    fullSolution: rt('פתרון מלא'),
    ...overrides,
  }
}

const groupsOf = (...blocks: unknown[]) =>
  [{ sectionIndex: null, blocks }] as unknown as ExerciseBlockGroup[]

const rankOf = (...blocks: unknown[]) => pickLandingDemoQuestion(groupsOf(...blocks))?.rank ?? 0

describe('pickLandingDemoQuestion', () => {
  it('ranks by how much written help the question has', () => {
    expect(rankOf(mcq())).toBe(3)
    expect(rankOf(mcq({ fullSolution: rt('  ') }))).toBe(2)
    expect(rankOf(mcq({ solution: undefined, fullSolution: undefined }))).toBe(1)
  })

  it('needs a single-answer MCQ with a written hint', () => {
    expect(rankOf(mcq({ hint: rt('') }))).toBe(0)
    expect(rankOf(mcq({ selectionMode: 'multiple' }))).toBe(0)
    expect(rankOf(mcq({ variant: 'true_false' }))).toBe(0)
  })

  it('skips questions with images, in the question or its stem', () => {
    expect(rankOf(mcq({ prompt: { ...rt('x'), mediaIds: ['m1'] } }))).toBe(0)
    expect(rankOf({ id: 'm', type: 'media', mediaId: 'abc' }, mcq())).toBe(0)
  })

  it('takes the best sub-question alone, with its stem and without its label', () => {
    const stem = { id: 's', type: 'rich_text', ...rt('נתון המספר 0.4') }
    const pick = pickLandingDemoQuestion(
      groupsOf(
        stem,
        mcq({ id: 'a', prompt: rt('**א.** ראשונה'), solution: undefined }),
        { id: 'b', type: 'question_free_response', prompt: rt('**ב.** פתוחה') },
        mcq({ id: 'c', prompt: rt('**ג.** שלישית') }),
      ),
    )
    expect(pick?.rank).toBe(3)
    const blocks = pick!.groups[0].blocks as unknown as Array<{
      id: string
      prompt?: { value: string }
    }>
    expect(blocks.map((b) => b.id)).toEqual(['s', 'c'])
    expect(blocks[1].prompt?.value).toBe('שלישית')
  })

  it('leaves prompts that start with a number alone', () => {
    const pick = pickLandingDemoQuestion(groupsOf(mcq({ prompt: rt('4.2 או 0.4?') })))
    const [question] = pick!.groups[0].blocks as unknown as Array<{ prompt: { value: string } }>
    expect(question.prompt.value).toBe('4.2 או 0.4?')
  })
})

import { describe, expect, it } from 'vitest'

import type { Exercise } from '@/infra/types/content'
import {
  classifySectionOutcome,
  getCountedSections,
  type AnswerBlockFacts,
} from '@/lib/exercises/sectionOutcome'

function facts(overrides: Partial<AnswerBlockFacts> = {}): AnswerBlockFacts {
  return {
    answered: true,
    finalCorrect: true,
    hadWrongAttempt: false,
    hintUsed: false,
    explanationUsed: false,
    selfChecked: false,
    ...overrides,
  }
}

describe('classifySectionOutcome', () => {
  it('correct with no help is alone', () => {
    expect(classifySectionOutcome([facts()])).toBe('alone')
  })

  it('any block that ended wrong makes the section wrong, even with help elsewhere', () => {
    expect(
      classifySectionOutcome([facts({ hintUsed: true }), facts({ finalCorrect: false })]),
    ).toBe('wrong')
  })

  it('nothing answered is skipped', () => {
    expect(classifySectionOutcome([facts({ answered: false }), facts({ answered: false })])).toBe(
      'skipped',
    )
  })

  it('an unanswered block does not count as wrong', () => {
    expect(classifySectionOutcome([facts({ answered: false, finalCorrect: false })])).toBe(
      'skipped',
    )
  })

  it.each([
    ['a wrong attempt', { hadWrongAttempt: true }],
    ['a hint', { hintUsed: true }],
    ['an explanation', { explanationUsed: true }],
    ['a self-check', { selfChecked: true }],
  ] as const)('correct with %s is with-help', (_label, help) => {
    expect(classifySectionOutcome([facts(help)])).toBe('with-help')
  })

  it('help on one block demotes a partly-answered section to with-help', () => {
    expect(
      classifySectionOutcome([facts({ answered: false }), facts({ explanationUsed: true })]),
    ).toBe('with-help')
  })

  it('a display-only section (no answer blocks) is alone', () => {
    expect(classifySectionOutcome([])).toBe('alone')
  })
})

describe('getCountedSections', () => {
  const question = { id: 'q', type: 'question_free_response' }
  const text = { id: 't', type: 'rich_text' }

  it('skips a display-only top-level group but keeps display-only sections', () => {
    const exercise = {
      id: 'ex',
      content: { blocks: [text] },
      sections: [
        { id: 's0', order: 0, content: { blocks: [question] } },
        { id: 's1', order: 1, content: { blocks: [text] } },
      ],
    } as unknown as Exercise
    const counted = getCountedSections(exercise)
    expect(counted.map((s) => s.groupIndex)).toEqual([1, 2])
    expect(counted.map((s) => s.answerBlocks.map((b) => b.id))).toEqual([['q'], []])
  })

  it('keeps a top-level group that has questions', () => {
    const exercise = { id: 'ex', content: { blocks: [text, question] } } as unknown as Exercise
    expect(getCountedSections(exercise).map((s) => s.groupIndex)).toEqual([0])
  })
})

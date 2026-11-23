import { describe, expect, it } from 'vitest'

import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { isLandingDemoCandidate } from '@/server/services/landing-demo-exercise'

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

describe('isLandingDemoCandidate', () => {
  it('takes a single-answer MCQ with written help', () => {
    expect(isLandingDemoCandidate(groupsOf(mcq()), true)).toBe(true)
  })

  it('needs the explanation only when asked for a complete one', () => {
    const noFull = groupsOf(mcq({ fullSolution: rt('  ') }))
    expect(isLandingDemoCandidate(noFull)).toBe(true)
    expect(isLandingDemoCandidate(noFull, true)).toBe(false)
  })

  it('skips empty hints, multi-select, other question types and extra questions', () => {
    expect(isLandingDemoCandidate(groupsOf(mcq({ hint: rt('') })))).toBe(false)
    expect(isLandingDemoCandidate(groupsOf(mcq({ selectionMode: 'multiple' })))).toBe(false)
    expect(isLandingDemoCandidate(groupsOf(mcq({ variant: 'true_false' })))).toBe(false)
    expect(isLandingDemoCandidate(groupsOf(mcq(), mcq({ id: 'q2' })))).toBe(false)
  })

  it('skips exercises with images', () => {
    const withImage = groupsOf({ id: 'm', type: 'media', mediaId: 'abc' }, mcq())
    expect(isLandingDemoCandidate(withImage)).toBe(false)
  })
})

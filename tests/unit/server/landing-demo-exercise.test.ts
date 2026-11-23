import { describe, expect, it } from 'vitest'

import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { rankLandingDemoCandidate } from '@/server/services/landing-demo-exercise'

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

describe('rankLandingDemoCandidate', () => {
  it('ranks by how much written help the question has', () => {
    expect(rankLandingDemoCandidate(groupsOf(mcq()))).toBe(3)
    expect(rankLandingDemoCandidate(groupsOf(mcq({ fullSolution: rt('  ') })))).toBe(2)
    expect(
      rankLandingDemoCandidate(groupsOf(mcq({ solution: undefined, fullSolution: undefined }))),
    ).toBe(1)
  })

  it('needs at least a written hint', () => {
    expect(rankLandingDemoCandidate(groupsOf(mcq({ hint: rt('') })))).toBe(0)
  })

  it('skips multi-select, other question types and extra questions', () => {
    expect(rankLandingDemoCandidate(groupsOf(mcq({ selectionMode: 'multiple' })))).toBe(0)
    expect(rankLandingDemoCandidate(groupsOf(mcq({ variant: 'true_false' })))).toBe(0)
    expect(rankLandingDemoCandidate(groupsOf(mcq(), mcq({ id: 'q2' })))).toBe(0)
  })

  it('skips exercises with images', () => {
    const withImage = groupsOf({ id: 'm', type: 'media', mediaId: 'abc' }, mcq())
    expect(rankLandingDemoCandidate(withImage)).toBe(0)
    expect(
      rankLandingDemoCandidate(groupsOf(mcq({ prompt: { ...rt('x'), mediaIds: ['m1'] } }))),
    ).toBe(0)
  })
})

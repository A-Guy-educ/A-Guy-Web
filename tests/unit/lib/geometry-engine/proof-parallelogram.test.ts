/**
 * Given ABCD is a parallelogram, prove △ABC ≅ △CDA.
 *
 * A classic grade-8 proof: opposite sides equal + shared diagonal + SSS.
 */
import { describe, expect, it } from 'vitest'
import { initState, validateEasy, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

const givens = () =>
  initState([
    { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
    { kind: 'triangle_exists', t: ['A', 'B', 'C'] },
    { kind: 'triangle_exists', t: ['C', 'D', 'A'] },
  ])

const SCRIPT: readonly {
  claim: Fact
  lemmaId: string
  label: string
}[] = [
  {
    label: 'Step 1: AB = CD (opposite sides of parallelogram)',
    claim: { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] },
    lemmaId: 'parallelogram_opposite_sides_eq',
  },
  {
    label: 'Step 2: BC = DA (opposite sides of parallelogram)',
    claim: { kind: 'segment_eq', a: ['B', 'C'], b: ['D', 'A'] },
    lemmaId: 'parallelogram_opposite_sides_eq',
  },
  {
    label: 'Step 3: AC = CA (reflexive)',
    claim: { kind: 'segment_eq', a: ['A', 'C'], b: ['C', 'A'] },
    lemmaId: 'reflexive_segment_eq',
  },
  {
    label: 'Step 4: △ABC ≅ △CDA (SSS)',
    claim: {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'C'],
      t2: ['C', 'D', 'A'],
    },
    lemmaId: 'congruence_sss',
  },
]

describe('Parallelogram → congruent halves', () => {
  it('hard mode: every step validates with the declared lemma', () => {
    let state = givens()
    for (const step of SCRIPT) {
      const r = validateHard(step.claim, step.lemmaId, state)
      if (!r.ok) throw new Error(`${step.label} — ${r.reason}`)
      state = r.state
    }
  })

  it('easy mode: engine picks a valid lemma for every step', () => {
    let state = givens()
    for (const step of SCRIPT) {
      const r = validateEasy(step.claim, state)
      if (!r.ok) throw new Error(`${step.label} — ${r.reason}`)
      state = r.state
    }
  })
})

describe('new converse lemmas', () => {
  it('#31: one pair opposite sides parallel & equal ⇒ parallelogram', () => {
    const state = initState([
      { kind: 'parallel', a: ['A', 'B'], b: ['C', 'D'] },
      { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] },
    ])
    const r = validateHard(
      { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
      'pair_parallel_eq_to_parallelogram',
      state,
    )
    expect(r.ok).toBe(true)
  })

  it('#29: both pairs of opposite angles equal ⇒ parallelogram', () => {
    const state = initState([
      { kind: 'angle_eq', a: ['D', 'A', 'B'], b: ['B', 'C', 'D'] },
      { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['C', 'D', 'A'] },
    ])
    const r = validateHard(
      { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
      'opposite_angles_eq_to_parallelogram',
      state,
    )
    expect(r.ok).toBe(true)
  })
})

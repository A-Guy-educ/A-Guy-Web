/**
 * Direct coverage for two lemmas that were previously exercised only by
 * easy-mode search inside other proofs: `reflexive_angle_eq` and
 * `right_angle_to_perp`.
 */
import { describe, expect, it } from 'vitest'
import { initState, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('reflexive_angle_eq', () => {
  it('∠ABC = ∠ABC with no preconditions', () => {
    const state = initState([])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'B', 'C'],
      b: ['A', 'B', 'C'],
    }
    const r = validateHard(claim, 'reflexive_angle_eq', state)
    expect(r.ok).toBe(true)
  })
})

describe('right_angle_to_perp', () => {
  it('∠ABC = 90° ⇒ AB ⊥ BC', () => {
    const state = initState([{ kind: 'angle_measure', angle: ['A', 'B', 'C'], degrees: 90 }])
    const claim: Fact = {
      kind: 'perpendicular',
      a: ['A', 'B'],
      b: ['B', 'C'],
    }
    const r = validateHard(claim, 'right_angle_to_perp', state)
    expect(r.ok).toBe(true)
  })
})

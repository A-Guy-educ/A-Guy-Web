/**
 * Regression: user scenario where AB=AC and AC=CD was in the DB, and the
 * student's claim AB=CD (or the equivalent BA=CD) was rejected because we
 * didn't have a transitivity lemma. The spec lists transitive chains as
 * one of the binding edge cases to cover.
 */
import { describe, expect, it } from 'vitest'
import { initState, validateEasy, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('Transitivity of equality', () => {
  it('AB=AC and AC=CD ⇒ AB=CD (segment_eq)', () => {
    const state = initState([
      { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'C'] },
      { kind: 'segment_eq', a: ['A', 'C'], b: ['C', 'D'] },
    ])
    const claim: Fact = {
      kind: 'segment_eq',
      a: ['A', 'B'],
      b: ['C', 'D'],
    }
    const r = validateHard(claim, 'transitive_segment_eq', state)
    expect(r.ok).toBe(true)
  })

  it('BA=CD (same as AB=CD after canonicalisation) also validates', () => {
    const state = initState([
      { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'C'] },
      { kind: 'segment_eq', a: ['A', 'C'], b: ['C', 'D'] },
    ])
    const claim: Fact = {
      kind: 'segment_eq',
      a: ['B', 'A'], // BA
      b: ['C', 'D'],
    }
    const r = validateEasy(claim, state)
    expect(r.ok).toBe(true)
  })

  it('∠ABC = ∠DEF and ∠DEF = ∠GHI ⇒ ∠ABC = ∠GHI (angle_eq)', () => {
    const state = initState([
      { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
      { kind: 'angle_eq', a: ['D', 'E', 'F'], b: ['G', 'H', 'I'] },
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'B', 'C'],
      b: ['G', 'H', 'I'],
    }
    const r = validateHard(claim, 'transitive_angle_eq', state)
    expect(r.ok).toBe(true)
  })

  it('rejects transitivity when no middle segment exists in the DB', () => {
    const state = initState([
      { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'C'] },
      // no AC = anything
    ])
    const claim: Fact = {
      kind: 'segment_eq',
      a: ['A', 'B'],
      b: ['X', 'Y'],
    }
    const r = validateHard(claim, 'transitive_segment_eq', state)
    expect(r.ok).toBe(false)
  })
})

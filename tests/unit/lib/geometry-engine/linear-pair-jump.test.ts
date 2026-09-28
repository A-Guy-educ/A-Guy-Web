/**
 * One-step ∠AFC = ∠BDE via the compound linear-pair-jump lemma.
 * Mirrors the user's CDEF-parallelogram fact pool exactly after step 2
 * (∠CFD = ∠EDF) and the auto-derived between triples from snapping F
 * and D onto segment AB in the correct positional order.
 */
import { describe, expect, it } from 'vitest'
import { initState, validateEasy, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('LINEAR_PAIR_JUMP — one-step outer angle equality', () => {
  it('∠AFC = ∠BDE in a single step from ∠CFD = ∠EDF plus collinear givens', () => {
    const state = initState([
      { kind: 'between', a: 'A', m: 'F', b: 'D' }, // F between A and D
      { kind: 'between', a: 'F', m: 'D', b: 'B' }, // D between F and B
      { kind: 'angle_eq', a: ['C', 'F', 'D'], b: ['E', 'D', 'F'] }, // step 2
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'F', 'C'],
      b: ['B', 'D', 'E'],
    }
    expect(validateHard(claim, 'linear_pair_jump', state).ok).toBe(true)
    expect(validateEasy(claim, state).ok).toBe(true)
  })

  it('rejects when a required between fact is missing', () => {
    const state = initState([
      { kind: 'between', a: 'A', m: 'F', b: 'D' },
      // no between(F, D, B)
      { kind: 'angle_eq', a: ['C', 'F', 'D'], b: ['E', 'D', 'F'] },
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'F', 'C'],
      b: ['B', 'D', 'E'],
    }
    expect(validateHard(claim, 'linear_pair_jump', state).ok).toBe(false)
  })

  it('rejects when the inner angle equality is missing', () => {
    const state = initState([
      { kind: 'between', a: 'A', m: 'F', b: 'D' },
      { kind: 'between', a: 'F', m: 'D', b: 'B' },
      // no inner angle equality
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'F', 'C'],
      b: ['B', 'D', 'E'],
    }
    expect(validateHard(claim, 'linear_pair_jump', state).ok).toBe(false)
  })
})

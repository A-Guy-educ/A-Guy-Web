/**
 * Regression + audit coverage for the triangle congruence + similarity
 * criteria. Purpose:
 *   1. Verify the user's exact rejected scenario now passes (SSS with a
 *      correspondence permutation, no `triangle_exists` in the givens).
 *   2. Smoke-test each criterion works from the minimum inputs a real
 *      student would write, without any pedantic `triangle_exists`
 *      declarations.
 */
import { describe, expect, it } from 'vitest'
import { initState, validateEasy, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('User regression: SSS with vertex permutation', () => {
  it('AB=DF, AC=DE, BC=EF ⇒ △ABC ≅ △DFE (via SSS)', () => {
    const state = initState([
      { kind: 'segment_eq', a: ['A', 'B'], b: ['D', 'F'] },
      { kind: 'segment_eq', a: ['A', 'C'], b: ['D', 'E'] },
      { kind: 'segment_eq', a: ['B', 'C'], b: ['E', 'F'] },
    ])
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'C'],
      t2: ['D', 'F', 'E'],
    }
    // Try both explicit lemma and auto (easy mode).
    expect(validateHard(claim, 'congruence_sss', state).ok).toBe(true)
    expect(validateEasy(claim, state).ok).toBe(true)
  })
})

describe('Triangle congruence criteria — minimum-input smoke', () => {
  it('SSS works with just three segment equalities', () => {
    const state = initState([
      { kind: 'segment_eq', a: ['A', 'B'], b: ['D', 'E'] },
      { kind: 'segment_eq', a: ['B', 'C'], b: ['E', 'F'] },
      { kind: 'segment_eq', a: ['A', 'C'], b: ['D', 'F'] },
    ])
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'C'],
      t2: ['D', 'E', 'F'],
    }
    expect(validateHard(claim, 'congruence_sss', state).ok).toBe(true)
  })

  it('SAS works with two sides + the included angle', () => {
    const state = initState([
      { kind: 'segment_eq', a: ['A', 'B'], b: ['D', 'E'] },
      { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
      { kind: 'segment_eq', a: ['B', 'C'], b: ['E', 'F'] },
    ])
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'C'],
      t2: ['D', 'E', 'F'],
    }
    expect(validateHard(claim, 'congruence_sas', state).ok).toBe(true)
  })

  it('ASA works with two angles + the included side', () => {
    const state = initState([
      { kind: 'angle_eq', a: ['C', 'A', 'B'], b: ['F', 'D', 'E'] },
      { kind: 'segment_eq', a: ['A', 'B'], b: ['D', 'E'] },
      { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
    ])
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'C'],
      t2: ['D', 'E', 'F'],
    }
    expect(validateHard(claim, 'congruence_asa', state).ok).toBe(true)
  })

  it('Similarity AA works with two angle equalities', () => {
    const state = initState([
      { kind: 'angle_eq', a: ['B', 'A', 'C'], b: ['E', 'D', 'F'] },
      { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
    ])
    const claim: Fact = {
      kind: 'triangle_similar',
      t1: ['A', 'B', 'C'],
      t2: ['D', 'E', 'F'],
    }
    expect(validateHard(claim, 'similarity_aa', state).ok).toBe(true)
  })

  it('EQUAL_ANGLES → EQUAL_SIDES works from just the angle equality', () => {
    const state = initState([{ kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['A', 'C', 'B'] }])
    const claim: Fact = {
      kind: 'segment_eq',
      a: ['A', 'B'],
      b: ['A', 'C'],
    }
    expect(validateHard(claim, 'equal_angles_to_equal_sides', state).ok).toBe(true)
  })
})

describe('SSS with vertex permutation — additional coverage', () => {
  // Systematic check: for every legal alignment of △ABC ≅ △DEF (6 dihedral
  // rotations/reflections × 1 = 6), SSS should validate given the
  // corresponding segment equalities.
  const permutations: readonly (readonly [string, string, string])[] = [
    ['D', 'E', 'F'],
    ['E', 'F', 'D'],
    ['F', 'D', 'E'],
    ['D', 'F', 'E'],
    ['E', 'D', 'F'],
    ['F', 'E', 'D'],
  ]
  for (const [d, e, f] of permutations) {
    it(`accepts △ABC ≅ △${d}${e}${f} given the right segment equalities`, () => {
      const state = initState([
        { kind: 'segment_eq', a: ['A', 'B'], b: [d!, e!] },
        { kind: 'segment_eq', a: ['B', 'C'], b: [e!, f!] },
        { kind: 'segment_eq', a: ['A', 'C'], b: [d!, f!] },
      ])
      const claim: Fact = {
        kind: 'triangle_congruent',
        t1: ['A', 'B', 'C'],
        t2: [d!, e!, f!],
      }
      expect(validateHard(claim, 'congruence_sss', state).ok).toBe(true)
    })
  }
})

describe('Parallel-lines lemmas (corrected between-preconds)', () => {
  it('parallel ⇒ alternate interior angles equal', () => {
    const state = initState([
      { kind: 'parallel', a: ['A', 'B'], b: ['C', 'D'] },
      { kind: 'between', a: 'A', m: 'P', b: 'B' },
      { kind: 'between', a: 'C', m: 'Q', b: 'D' },
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'P', 'Q'],
      b: ['D', 'Q', 'P'],
    }
    expect(validateHard(claim, 'parallel_to_alternate_angles', state).ok).toBe(true)
  })

  it('alternate angles equal ⇒ parallel (converse)', () => {
    const state = initState([
      { kind: 'between', a: 'A', m: 'P', b: 'B' },
      { kind: 'between', a: 'C', m: 'Q', b: 'D' },
      { kind: 'angle_eq', a: ['A', 'P', 'Q'], b: ['D', 'Q', 'P'] },
    ])
    const claim: Fact = {
      kind: 'parallel',
      a: ['A', 'B'],
      b: ['C', 'D'],
    }
    expect(validateHard(claim, 'alternate_angles_to_parallel', state).ok).toBe(true)
  })
})

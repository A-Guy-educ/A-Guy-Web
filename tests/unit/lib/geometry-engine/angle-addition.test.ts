/**
 * User's parallelogram-with-flanking-triangles proof:
 *
 *   ABCD is a parallelogram. E hangs off side AD (so triangle ADE),
 *   F hangs off side BC (so triangle BCF). Given AE = CF and BF = DE,
 *   prove ∠EAB = ∠FCD.
 *
 * The final step needs angle addition:
 *   ∠EAB = ∠EAD + ∠DAB  (ray AD inside ∠EAB)
 *   ∠FCD = ∠FCB + ∠BCD  (ray CB inside ∠FCD)
 *   and ∠EAD = ∠FCB (step 4) + ∠DAB = ∠BCD (step 3) ⇒ ∠EAB = ∠FCD.
 */
import { describe, expect, it } from 'vitest'
import { initState, validateEasy, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('Angle addition — parallelogram + flanking triangles', () => {
  it('proves ∠EAB = ∠FCD from equal parts + ray_between givens', () => {
    // Pre-populate the proof state with everything up through step 4.
    let state = initState([
      // structural givens the student would add
      { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
      { kind: 'segment_eq', a: ['A', 'E'], b: ['C', 'F'] },
      { kind: 'segment_eq', a: ['B', 'F'], b: ['D', 'E'] },
      // extra structural givens for angle addition
      { kind: 'ray_between', vertex: 'A', a: 'E', m: 'D', b: 'B' }, // ray AD inside ∠EAB
      { kind: 'ray_between', vertex: 'C', a: 'F', m: 'B', b: 'D' }, // ray CB inside ∠FCD
      // step 1 (AD = BC)
      { kind: 'segment_eq', a: ['A', 'D'], b: ['B', 'C'] },
      // step 2 (△ADE ≅ △CBF)
      { kind: 'triangle_congruent', t1: ['A', 'D', 'E'], t2: ['C', 'B', 'F'] },
      // step 3 (∠BAD = ∠BCD)
      { kind: 'angle_eq', a: ['B', 'A', 'D'], b: ['B', 'C', 'D'] },
      // step 4 (∠BCF = ∠DAE)
      { kind: 'angle_eq', a: ['B', 'C', 'F'], b: ['D', 'A', 'E'] },
    ])

    // Final step: ∠EAB = ∠FCD via angle addition.
    const finalClaim: Fact = {
      kind: 'angle_eq',
      a: ['E', 'A', 'B'],
      b: ['F', 'C', 'D'],
    }

    // Hard mode — explicit lemma.
    const rHard = validateHard(finalClaim, 'angle_addition_eq', state)
    expect(rHard.ok).toBe(true)

    // Easy mode — engine finds it.
    const rEasy = validateEasy(finalClaim, state)
    expect(rEasy.ok).toBe(true)
    if (rEasy.ok) {
      expect(rEasy.lemma.id).toBe('angle_addition_eq')
      state = rEasy.state
    }
  })

  it('rejects when ray_between fact is missing (structural gap)', () => {
    // Same proof state but without the ray_between givens.
    const state = initState([
      { kind: 'angle_eq', a: ['B', 'A', 'D'], b: ['B', 'C', 'D'] },
      { kind: 'angle_eq', a: ['B', 'C', 'F'], b: ['D', 'A', 'E'] },
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['E', 'A', 'B'],
      b: ['F', 'C', 'D'],
    }
    const r = validateHard(claim, 'angle_addition_eq', state)
    expect(r.ok).toBe(false)
  })
})

/**
 * User's CDEF-parallelogram scenario ending with ∠AFC = ∠BDE.
 *
 * The full derivation from ∠CFD = ∠EDF to ∠AFC = ∠BDE:
 *   1. Linear pair at F   → angle_sum([∠AFC, ∠CFD], 180)
 *   2. Linear pair at D   → angle_sum([∠BDE, ∠EDF], 180)
 *   3. Given equality     → ∠CFD = ∠EDF
 *   4. Supplements of equal angles → ∠AFC = ∠BDE
 */
import { describe, expect, it } from 'vitest'
import { initState, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('CDEF-parallelogram: ∠AFC = ∠BDE via supplements of equal angles', () => {
  it('proves ∠AFC = ∠BDE step by step', () => {
    // Setup mirrors the user's fact pool AFTER snapping F and D onto
    // segment AB in the correct positional order (A—F—D—B).
    let state = initState([
      { kind: 'segment_exists', s: ['A', 'B'] },
      { kind: 'between', a: 'A', m: 'F', b: 'B' },
      { kind: 'between', a: 'A', m: 'D', b: 'B' },
      // NB: these two are the autopilot triples the new snap logic
      // emits — with F closer to A and D closer to B (positional order
      // along AB), we get:
      { kind: 'between', a: 'A', m: 'F', b: 'D' }, // F between A and D
      { kind: 'between', a: 'F', m: 'D', b: 'B' }, // D between F and B
      { kind: 'parallelogram', q: ['C', 'D', 'E', 'F'] },
      { kind: 'segment_eq', a: ['A', 'C'], b: ['B', 'E'] },
      // Step 1 (from parallelogram opposite-sides-parallel):
      { kind: 'parallel', a: ['C', 'F'], b: ['D', 'E'] },
      // Step 2 (from parallel_alternate_at_endpoints):
      { kind: 'angle_eq', a: ['C', 'F', 'D'], b: ['E', 'D', 'F'] },
    ])

    // Step 3: linear pair at F with A on one side, D on the other.
    const s3: Fact = {
      kind: 'angle_sum',
      angles: [
        ['C', 'F', 'A'],
        ['C', 'F', 'D'],
      ],
      degrees: 180,
    }
    const r3 = validateHard(s3, 'linear_pair', state)
    expect(r3.ok).toBe(true)
    if (!r3.ok) return
    state = r3.state

    // Step 4: linear pair at D with F on one side, B on the other.
    const s4: Fact = {
      kind: 'angle_sum',
      angles: [
        ['E', 'D', 'F'],
        ['E', 'D', 'B'],
      ],
      degrees: 180,
    }
    const r4 = validateHard(s4, 'linear_pair', state)
    expect(r4.ok).toBe(true)
    if (!r4.ok) return
    state = r4.state

    // Step 5: supplements of equal angles ⇒ ∠AFC = ∠BDE.
    const s5: Fact = {
      kind: 'angle_eq',
      a: ['A', 'F', 'C'],
      b: ['B', 'D', 'E'],
    }
    const r5 = validateHard(s5, 'supplements_of_equal_angles', state)
    expect(r5.ok).toBe(true)
  })

  it('rejects supplements_of_equal_angles when the middle equality is missing', () => {
    const state = initState([
      {
        kind: 'angle_sum',
        angles: [
          ['A', 'F', 'C'],
          ['C', 'F', 'D'],
        ],
        degrees: 180,
      },
      {
        kind: 'angle_sum',
        angles: [
          ['B', 'D', 'E'],
          ['E', 'D', 'F'],
        ],
        degrees: 180,
      },
      // no ∠CFD = ∠EDF
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'F', 'C'],
      b: ['B', 'D', 'E'],
    }
    const r = validateHard(claim, 'supplements_of_equal_angles', state)
    expect(r.ok).toBe(false)
  })
})

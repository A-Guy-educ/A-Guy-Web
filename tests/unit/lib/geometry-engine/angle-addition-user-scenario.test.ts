/**
 * Regression: user's ∠ACD = ∠BEF step from the CDEF-parallelogram
 * scenario. Given step 5 (∠ACF = ∠BED) + step 6 (∠DCF = ∠DEF) plus the
 * auto-derived ray_between facts, angle_addition_eq should validate the
 * outer angle equality in one step.
 */
import { describe, expect, it } from 'vitest'
import { computeDerivedGeometryFacts } from '@/lib/geometry-engine/derive-facts'
import { initState, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'
import type { PlacedPoint } from '@/lib/geometry-engine/sandbox'

const POINTS: readonly PlacedPoint[] = [
  { name: 'A', x: 0, y: 500 },
  { name: 'B', x: 700, y: 0 },
  { name: 'C', x: 200, y: 100 },
  { name: 'D', x: 500, y: 100 },
  { name: 'E', x: 550, y: 320 },
  { name: 'F', x: 250, y: 320 },
]

describe('User scenario: ∠ACD = ∠BEF via angle_addition_eq', () => {
  it('validates once step 5 + step 6 + auto-derived ray_between are in the pool', () => {
    const derived = computeDerivedGeometryFacts(POINTS)
    const givens: Fact[] = [
      { kind: 'angle_eq', a: ['A', 'C', 'F'], b: ['B', 'E', 'D'] }, // step 5
      { kind: 'angle_eq', a: ['D', 'C', 'F'], b: ['D', 'E', 'F'] }, // step 6
      ...derived,
    ]
    const state = initState(givens)
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'C', 'D'],
      b: ['B', 'E', 'F'],
    }
    const r = validateHard(claim, 'angle_addition_eq', state)
    expect(r.ok).toBe(true)
  })
})

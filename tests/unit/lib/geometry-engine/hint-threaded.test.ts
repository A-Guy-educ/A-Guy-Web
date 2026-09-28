/**
 * Regression: user's ∠ACD = ∠BEF scenario when they have step 5
 * (∠ACF = ∠BED) + auto-derived ray_between + parallelogram(CDEF) but
 * haven't yet derived step 6 (∠DCF = ∠DEF).
 *
 * The engine should surface a hint saying "you're missing ∠FCD = ∠DEF —
 * derivable via parallelogram_opposite_angles_eq". The old hint search
 * used independent per-precond checks and thought nothing was missing;
 * the fix uses threaded backtracking (same as the diagnostic) so the
 * shared M/N vars stay consistent across the check.
 */
import { describe, expect, it } from 'vitest'
import { computeDerivedGeometryFacts } from '@/lib/geometry-engine/derive-facts'
import { formatFact } from '@/lib/geometry-engine/format'
import { initState, validateEasy } from '@/lib/geometry-engine/validator'
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

describe('Hint search: threaded backtracking catches missing shared-var precond', () => {
  it('surfaces "establish ∠FCD = ∠DEF via parallelogram_opposite_angles_eq" for ∠ACD = ∠BEF', () => {
    const derived = computeDerivedGeometryFacts(POINTS)
    const state = initState([
      { kind: 'parallelogram', q: ['C', 'D', 'E', 'F'] },
      { kind: 'angle_eq', a: ['A', 'C', 'F'], b: ['B', 'E', 'D'] }, // step 5
      // NO step 6.
      ...derived,
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'C', 'D'],
      b: ['B', 'E', 'F'],
    }
    const r = validateEasy(claim, state)
    expect(r.ok).toBe(false)
    if (r.ok) return

    expect(r.hints).toBeTruthy()
    expect(r.hints!.length).toBeGreaterThan(0)

    // At least one hint should point at the parallelogram_opposite_angles_eq
    // derivation of the missing ∠FCD = ∠DEF equality.
    const oppositeHint = r.hints!.find((h) => h.viaLemma.id === 'parallelogram_opposite_angles_eq')
    expect(oppositeHint).toBeTruthy()

    const printed = formatFact(oppositeHint!.missingFact)
    // The missing fact should be the angle equality involving vertices
    // C and E with outer rays D and F on each side.
    expect(
      printed.includes('C') &&
        printed.includes('D') &&
        printed.includes('E') &&
        printed.includes('F'),
    ).toBe(true)
  })
})

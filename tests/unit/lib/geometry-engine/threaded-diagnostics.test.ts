/**
 * Threaded-diagnostics regression.
 *
 * Old bug: computeDiagnostics checked each precondition independently
 * against the fact pool, so shared variables (like `M` and `N` in
 * angle_addition_eq) could be reported "satisfied" under different
 * bindings for different rows. Result: a diagnostic like
 *
 *   ✓ ray CE inside ∠ACD          (M bound to E)
 *   ✓ ∠ACF = ∠BED                 (M bound to F)
 *   ✗ ∠?MCD = ∠?NEF               (M unbound)
 *
 * — visually incoherent because the same variable ends up displayed as
 * both E, F, and ?M across rows.
 *
 * New behavior: findDeepestPartialMatch threads bindings via
 * backtracking, and computeDiagnostics only displays preconds up to the
 * first that can't be satisfied under the threaded binding. Shared
 * variables show a single consistent value across all displayed rows.
 */
import { describe, expect, it } from 'vitest'
import { computeDerivedGeometryFacts } from '@/lib/geometry-engine/derive-facts'
import { formatFact } from '@/lib/geometry-engine/format'
import { validateHard, initState } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'
import type { PlacedPoint } from '@/lib/geometry-engine/sandbox'

describe('Threaded diagnostics', () => {
  it('shows a coherent partial-match: shared variables get one consistent binding', () => {
    // Setup: everything for angle_addition_eq's ∠ACD = ∠BEF is in place
    // EXCEPT step 6 (∠DCF = ∠DEF). So the matcher gets through preconds
    // 1-3 with M=F, N=D, then fails at precond 4 (the missing angle_eq).
    // Old code would have mixed M values across rows. New code shows all
    // three satisfied rows with M=F and N=D, and the ✗ row substituted
    // with the same threaded binding.
    const POINTS: PlacedPoint[] = [
      { name: 'A', x: 0, y: 500 },
      { name: 'B', x: 700, y: 0 },
      { name: 'C', x: 200, y: 100 },
      { name: 'D', x: 500, y: 100 },
      { name: 'E', x: 550, y: 320 },
      { name: 'F', x: 250, y: 320 },
    ]
    const derived = computeDerivedGeometryFacts(POINTS)
    const state = initState([
      { kind: 'angle_eq', a: ['A', 'C', 'F'], b: ['B', 'E', 'D'] }, // step 5
      // NO step 6 — this is the missing piece.
      ...derived,
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'C', 'D'],
      b: ['B', 'E', 'F'],
    }
    const r = validateHard(claim, 'angle_addition_eq', state)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.diagnostics).toBeTruthy()
    const d = r.diagnostics!

    // Should have satisfied ≥ 3 preconds (both ray_betweens + step-5
    // angle_eq under M=F, N=D).
    expect(d.satisfiedCount).toBeGreaterThanOrEqual(3)
    // Exactly one row displayed as failing (the missing ∠FCD = ∠DEF).
    const failing = d.preconditions.filter((p) => !p.satisfied)
    expect(failing.length).toBe(1)
    // The failing precond should be an angle_eq (that's precond 4).
    expect(failing[0]!.substituted.kind).toBe('angle_eq')

    // Displayed satisfied precond 3 should read ∠ACF = ∠BED (M=F, N=D
    // threaded through — NOT ∠ACE = ∠BEC which would be M=E, N=C).
    const satisfied = d.preconditions.filter((p) => p.satisfied)
    const printed = satisfied.map((p) => formatFact(p.substituted))
    expect(printed.some((s) => s.includes('ACF') && s.includes('BED'))).toBe(true)
  })
})

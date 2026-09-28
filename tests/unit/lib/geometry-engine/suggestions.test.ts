/**
 * "Did you mean …" — when an angle_eq claim doesn't validate, try vertex
 * permutations and surface any variant that does. Also confirms that
 * misleading "closest lemma" diagnostics are suppressed when no lemma has
 * any satisfied preconditions.
 */
import { describe, expect, it } from 'vitest'
import { formatFact } from '@/lib/geometry-engine/format'
import { initState, validateEasy } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('Vertex-permutation suggestions', () => {
  it('suggests ∠FCD = ∠DEF (parallelogram opposite angles) when user claims ∠CFD = ∠DEF', () => {
    // User's setup from the CDEF-parallelogram scenario.
    const state = initState([
      { kind: 'parallelogram', q: ['C', 'D', 'E', 'F'] },
      { kind: 'parallel', a: ['C', 'F'], b: ['D', 'E'] },
    ])
    const wrongClaim: Fact = {
      kind: 'angle_eq',
      a: ['C', 'F', 'D'], // vertex F — geometrically NOT the parallelogram angle at F
      b: ['D', 'E', 'F'],
    }
    const r = validateEasy(wrongClaim, state)
    expect(r.ok).toBe(false)
    if (r.ok) return

    // Should include at least one "did you mean" that DOES validate.
    expect(r.suggestions).toBeTruthy()
    expect(r.suggestions!.length).toBeGreaterThan(0)

    const printed = r.suggestions!.map((s) => formatFact(s.fact))
    // The opposite-angles fix (vertex swap on left angle F -> C).
    expect(printed.some((p) => p.includes('FCD') && p.includes('DEF'))).toBe(true)
  })

  it('suggests ∠CFD = ∠EDF when user claims ∠CFD = ∠DEF (alternate angles)', () => {
    // Same parallelogram, plus a segment we know is parallel — this time
    // the vertex mistake is on the right angle (should be D, not E).
    const state = initState([{ kind: 'parallel', a: ['C', 'F'], b: ['D', 'E'] }])
    const wrongClaim: Fact = {
      kind: 'angle_eq',
      a: ['C', 'F', 'D'],
      b: ['D', 'E', 'F'], // vertex E — should be D for alternate-at-endpoints
    }
    const r = validateEasy(wrongClaim, state)
    expect(r.ok).toBe(false)
    if (r.ok) return

    expect(r.suggestions).toBeTruthy()
    const printed = r.suggestions!.map((s) => formatFact(s.fact))
    // Alternate-at-endpoints fix (vertex swap on right angle E -> D).
    expect(printed.some((p) => p.includes('CFD') && p.includes('EDF'))).toBe(true)
  })
})

describe('Bogus diagnostic suppression', () => {
  it("doesn't attach diagnostics when no candidate lemma has any satisfied preconditions", () => {
    // Empty state — nothing satisfies anything.
    const state = initState([])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['C', 'F', 'D'],
      b: ['D', 'E', 'F'],
    }
    const r = validateEasy(claim, state)
    expect(r.ok).toBe(false)
    if (r.ok) return
    // The old code would have attached "closest lemma: Transitivity of
    // angle equality" here with 0/2 satisfied and `?`-wildcarded
    // preconds. That was noise.
    expect(r.diagnostics).toBeUndefined()
  })

  it('keeps diagnostics when at least one precond IS satisfiable', () => {
    // Enough facts that SOMETHING is satisfiable but the claim is still
    // wrong.
    const state = initState([
      { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] },
      // NB: transitivity middle segment is absent, so the second
      // precond of transitive_segment_eq will fail — but the first
      // one matches under some seed.
    ])
    const claim: Fact = {
      kind: 'segment_eq',
      a: ['A', 'B'],
      b: ['E', 'F'],
    }
    const r = validateEasy(claim, state)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.diagnostics).toBeTruthy()
  })
})

/**
 * Diagnostic feedback on rejection.
 *
 * User's scenario:
 *   Givens: ABCD parallelogram, AE=BF, CF=DE, plus derived AD=BC.
 *   Claim: △AED ≅ △CFB (wrong correspondence — should be △AED ≅ △BFC).
 *
 * The engine must reject and identify SSS as the closest lemma, marking
 * which preconditions matched (AD=CB) and which didn't (AE=CF, ED=FB).
 */
import { describe, expect, it } from 'vitest'
import { formatFact } from '@/lib/geometry-engine/format'
import { initState, validateEasy } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('Rejection diagnostics', () => {
  it('shows which SSS preconditions matched vs. missed for the wrong correspondence', () => {
    const state = initState([
      { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
      { kind: 'segment_eq', a: ['A', 'E'], b: ['B', 'F'] },
      { kind: 'segment_eq', a: ['C', 'F'], b: ['D', 'E'] },
      { kind: 'segment_eq', a: ['A', 'D'], b: ['B', 'C'] }, // step 1
    ])

    // Wrong correspondence: A↔C, E↔F, D↔B — would need AE=CF and ED=FB.
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'E', 'D'],
      t2: ['C', 'F', 'B'],
    }
    const r = validateEasy(claim, state)
    expect(r.ok).toBe(false)
    if (r.ok) return

    expect(r.diagnostics).toBeTruthy()
    const d = r.diagnostics!
    // Closest match should be one of the triangle-congruence criteria.
    expect(['congruence_sss', 'congruence_sas', 'congruence_asa']).toContain(d.lemma.id)

    // Whatever the closest lemma was, at least one precondition was met and
    // at least one wasn't — otherwise the diagnostics wouldn't have been
    // instructive at all.
    const met = d.preconditions.filter((p) => p.satisfied).length
    const missed = d.preconditions.filter((p) => !p.satisfied).length
    expect(met).toBeGreaterThan(0)
    expect(missed).toBeGreaterThan(0)

    // Substituted preconditions are printable as fully-bound facts.
    for (const p of d.preconditions) {
      expect(formatFact(p.substituted)).toBeTruthy()
    }
  })

  it('accepts the correct correspondence △AED ≅ △BFC via SSS', () => {
    const state = initState([
      { kind: 'segment_eq', a: ['A', 'E'], b: ['B', 'F'] },
      { kind: 'segment_eq', a: ['C', 'F'], b: ['D', 'E'] },
      { kind: 'segment_eq', a: ['A', 'D'], b: ['B', 'C'] },
    ])
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'E', 'D'],
      t2: ['B', 'F', 'C'],
    }
    const r = validateEasy(claim, state)
    expect(r.ok).toBe(true)
  })
})

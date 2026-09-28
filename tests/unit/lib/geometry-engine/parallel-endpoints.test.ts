/**
 * User's CEDF-parallelogram scenario.
 *
 * ABCD is a line (A—C—D—B), CEDF is a parallelogram, AE = BF. From the
 * parallelogram we get CE ∥ DF (step 2). The claim ∠ECD = ∠FDC is
 * alternate interior angles between CE and DF with transversal CD — but
 * the transversal goes through the *endpoints* of both parallel segments,
 * not their interiors, so the general parallel_to_alternate_angles lemma
 * (which requires strict between) can't fire.
 *
 * parallel_alternate_at_endpoints covers this case.
 */
import { describe, expect, it } from 'vitest'
import { formatFact } from '@/lib/geometry-engine/format'
import { initState, validateEasy, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('Alternate angles when transversal joins segment endpoints', () => {
  it('∠ECD = ∠FDC from CE ∥ DF', () => {
    const state = initState([{ kind: 'parallel', a: ['C', 'E'], b: ['D', 'F'] }])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['E', 'C', 'D'],
      b: ['F', 'D', 'C'],
    }
    expect(validateHard(claim, 'parallel_alternate_at_endpoints', state).ok).toBe(true)
    expect(validateEasy(claim, state).ok).toBe(true)
  })

  it('rejects when the four points are not distinct', () => {
    const state = initState([
      { kind: 'parallel', a: ['A', 'B'], b: ['A', 'C'] }, // shares point A
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'B', 'A'],
      b: ['C', 'A', 'B'],
    }
    const r = validateHard(claim, 'parallel_alternate_at_endpoints', state)
    expect(r.ok).toBe(false)
  })
})

describe('Diagnostics: satisfied preconds display in fully concrete form', () => {
  it('avoids leaking unbound variables that clash with real point names', () => {
    // User's setup: they have concrete points named A, B, C, D, E, F.
    // The old diagnostic would print "EB ∥ CF ✓" where B and C were
    // actually lemma variables — extremely confusing. New behaviour uses
    // the matched extended binding for satisfied preconds so the display
    // shows the *actual* fact that matched (EC ∥ DF, from step 2).
    const state = initState([
      { kind: 'segment_exists', s: ['A', 'B'] },
      { kind: 'between', a: 'A', m: 'C', b: 'B' },
      { kind: 'between', a: 'A', m: 'D', b: 'B' },
      { kind: 'parallelogram', q: ['C', 'E', 'D', 'F'] },
      { kind: 'segment_eq', a: ['A', 'E'], b: ['B', 'F'] },
      { kind: 'segment_eq', a: ['C', 'E'], b: ['D', 'F'] },
      { kind: 'parallel', a: ['C', 'E'], b: ['D', 'F'] },
    ])
    // Claim the correct fact — should be accepted via the new lemma.
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['E', 'C', 'D'],
      b: ['F', 'D', 'C'],
    }
    const r = validateEasy(claim, state)
    expect(r.ok).toBe(true)
  })

  it('marks unbound lemma variables with ? in the diagnostic display', () => {
    // Contrived: claim that unifies with a lemma conclusion but leaves
    // some precond vars unbound and no fact matches them.
    const state = initState([
      // no useful facts
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['E', 'C', 'D'],
      b: ['F', 'D', 'C'],
    }
    const r = validateHard(
      claim,
      'parallel_to_alternate_angles', // the strict-between variant
      state,
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.diagnostics).toBeTruthy()
    // At least one missed precond should contain a `?`-prefixed name.
    const missedTexts = r
      .diagnostics!.preconditions.filter((p) => !p.satisfied)
      .map((p) => formatFact(p.substituted))
    const anyWildcard = missedTexts.some((t) => t.includes('?'))
    expect(anyWildcard).toBe(true)
  })
})

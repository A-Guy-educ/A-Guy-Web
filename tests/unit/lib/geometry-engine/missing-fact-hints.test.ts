/**
 * "You're one step away" hint search.
 *
 * User's scenario: parallelogram ABCD, they claim ∠ADB = ∠CBD (alternate
 * interior angles between AD and BC with transversal BD). Correct — but
 * requires parallel(AD, BC) as a precondition, which they haven't derived
 * yet. The hint search should surface it, together with the lemma that
 * would produce it (parallelogram_parallel_sides).
 */
import { describe, expect, it } from 'vitest'
import { initState, validateEasy } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'
import { formatFact } from '@/lib/geometry-engine/format'

describe('Missing-fact hint search', () => {
  it('user has ABCD parallelogram, claims ∠ADB = ∠CBD → hint: establish parallel(AD, BC)', () => {
    const state = initState([{ kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] }])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'D', 'B'],
      b: ['C', 'B', 'D'],
    }
    const r = validateEasy(claim, state)
    expect(r.ok).toBe(false)
    if (r.ok) return

    expect(r.hints).toBeTruthy()
    expect(r.hints!.length).toBeGreaterThan(0)

    // At least one hint should say: establish AD ∥ BC (or BC ∥ AD)
    // via parallelogram_parallel_sides.
    const parallelHint = r.hints!.find(
      (h) => h.missingFact.kind === 'parallel' && h.viaLemma.id === 'parallelogram_parallel_sides',
    )
    expect(parallelHint).toBeTruthy()

    const printed = formatFact(parallelHint!.missingFact)
    // The parallel fact should mention both AD (or DA) and BC (or CB).
    const involvesADBC =
      (printed.includes('AD') || printed.includes('DA')) &&
      (printed.includes('BC') || printed.includes('CB'))
    expect(involvesADBC).toBe(true)
  })

  it('no hint when there are zero unmet preconditions (direct match works)', () => {
    const state = initState([{ kind: 'parallel', a: ['A', 'D'], b: ['B', 'C'] }])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'D', 'B'],
      b: ['C', 'B', 'D'],
    }
    const r = validateEasy(claim, state)
    // Direct match — should validate outright.
    expect(r.ok).toBe(true)
  })

  it('no hint when 2+ preconditions are missing (not "one step away")', () => {
    // Bare state — SSS needs 3 segment equalities and we have zero, so no
    // single-lemma jump can rescue us.
    const state = initState([])
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'C'],
      t2: ['D', 'E', 'F'],
    }
    const r = validateEasy(claim, state)
    expect(r.ok).toBe(false)
    if (r.ok) return
    // Might be empty; certainly shouldn't be a valid "you're one step away".
    expect(r.hints?.length ?? 0).toBe(0)
  })
})

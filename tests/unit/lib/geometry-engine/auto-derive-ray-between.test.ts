/**
 * Auto-derive `ray_between` facts from point coordinates, then verify the
 * user's ∠ACD = ∠BEF step validates in one go without a single manually
 * typed `ray_between` fact.
 */
import { describe, expect, it } from 'vitest'
import { computeDerivedGeometryFacts } from '@/lib/geometry-engine/derive-facts'
import { addFact, initState, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'
import type { PlacedPoint } from '@/lib/geometry-engine/sandbox'

const POINTS: readonly PlacedPoint[] = [
  // Coordinates chosen to mirror the user's CDEF-parallelogram screenshot.
  // A-F-D-B roughly along a diagonal, C upper-left, E lower-right.
  { name: 'A', x: 0, y: 500 },
  { name: 'B', x: 700, y: 0 },
  { name: 'C', x: 200, y: 100 },
  { name: 'D', x: 500, y: 100 },
  { name: 'E', x: 550, y: 320 },
  { name: 'F', x: 250, y: 320 },
]

describe('computeDerivedGeometryFacts', () => {
  it('detects F inside ∠ACD and D inside ∠BEF', () => {
    const derived = computeDerivedGeometryFacts(POINTS)
    // Verify the two specific ray_between facts needed for angle_addition_eq
    // on ∠ACD = ∠BEF are among the derived facts.
    const has = (vertex: string, a: string, m: string, b: string): boolean =>
      derived.some(
        (f) =>
          f.kind === 'ray_between' &&
          f.vertex === vertex &&
          f.m === m &&
          ((f.a === a && f.b === b) || (f.a === b && f.b === a)),
      )
    expect(has('C', 'A', 'F', 'D')).toBe(true)
    expect(has('E', 'B', 'D', 'F')).toBe(true)
  })

  it('does NOT emit ray_between for points outside the wedge', () => {
    // Point A is outside every ∠V?? triangle that doesn't involve A —
    // in particular ray_between(C, D, A, F) would be false since A is
    // way below and to the left, not between rays CD and CF.
    const derived = computeDerivedGeometryFacts(POINTS)
    const bogus = derived.some(
      (f) =>
        f.kind === 'ray_between' &&
        f.vertex === 'C' &&
        f.m === 'A' &&
        (f.a === 'D' || f.b === 'D') &&
        (f.a === 'F' || f.b === 'F'),
    )
    expect(bogus).toBe(false)
  })
})

describe('End-to-end: ∠ACD = ∠BEF validates with auto-derived ray_between', () => {
  it('validates in a single step after startProving injects derived facts', () => {
    // Simulate the user's fact pool at the moment they claim ∠ACD = ∠BEF.
    const givens: Fact[] = [
      // Step 5 (established): ∠ACF = ∠BED
      { kind: 'angle_eq', a: ['A', 'C', 'F'], b: ['B', 'E', 'D'] },
      // Step 6 (established): ∠DCF = ∠DEF
      { kind: 'angle_eq', a: ['D', 'C', 'F'], b: ['D', 'E', 'F'] },
    ]
    // Merge in the auto-derived geometry facts (as startProving does).
    let state = initState([...givens, ...computeDerivedGeometryFacts(POINTS)])
    // Confirm the two crucial ray_between facts are present.
    const rayBetweenFacts = state.facts.filter((f) => f.kind === 'ray_between')
    expect(rayBetweenFacts.length).toBeGreaterThan(0)

    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'C', 'D'],
      b: ['B', 'E', 'F'],
    }
    const r = validateHard(claim, 'angle_addition_eq', state)
    expect(r.ok).toBe(true)
  })

  it('addFact dedupes derived facts — no runaway growth on repeated syncs', () => {
    let state = initState([])
    const derived = computeDerivedGeometryFacts(POINTS)
    for (const f of derived) state = addFact(state, f)
    const sizeAfterFirst = state.facts.length

    // Sync again — nothing should be added.
    for (const f of derived) state = addFact(state, f)
    expect(state.facts.length).toBe(sizeAfterFirst)
  })
})

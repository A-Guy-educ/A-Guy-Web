/**
 * Regression coverage for the lazy matcher.
 *
 * The eager `matchAll` used to materialise every combinatorially-valid
 * binding before `tryLemma` could pick one. In a rich fact DB that
 * ballooned fast enough to freeze the browser main thread. These tests
 * exercise:
 *   - Laziness of `matchAllGen` (caller can stop after the first yield).
 *   - `validateHard` returns quickly for a valid claim even when the DB
 *     has many facts that could partially match SSS's preconditions.
 */
import { describe, expect, it } from 'vitest'
import { matchAllGen } from '@/lib/geometry-engine/match'
import { initState, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('matchAllGen laziness', () => {
  it('yields on-demand — caller can stop after the first binding', () => {
    // Two facts, each of which independently matches the pattern.
    const state = initState([
      { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'B'] },
      { kind: 'segment_eq', a: ['C', 'D'], b: ['C', 'D'] },
    ])
    const gen = matchAllGen([{ kind: 'segment_eq', a: ['X', 'Y'], b: ['X', 'Y'] }], state.facts, {})
    const first = gen.next()
    expect(first.done).toBe(false)
    expect(first.value).toBeTruthy()
    // Stopping here — the second binding is never computed.
  })
})

describe('validateHard performance under a rich fact DB', () => {
  it('finds SSS binding quickly even with many red-herring segment facts', () => {
    const facts: Fact[] = []

    // Sprinkle many self-equalities that could partially unify with SSS's
    // 3 segment-equality preconditions in wrong ways.
    for (let i = 0; i < 20; i++) {
      const a = String.fromCharCode(65 + (i % 13)) // A..M
      const b = String.fromCharCode(78 + (i % 13)) // N..Z
      facts.push({ kind: 'segment_eq', a: [a, b], b: [a, b] })
    }
    // The specific SSS scenario we want validated.
    facts.push({ kind: 'triangle_exists', t: ['P', 'Q', 'R'] })
    facts.push({ kind: 'triangle_exists', t: ['S', 'T', 'U'] })
    facts.push({ kind: 'segment_eq', a: ['P', 'Q'], b: ['S', 'T'] })
    facts.push({ kind: 'segment_eq', a: ['Q', 'R'], b: ['T', 'U'] })
    facts.push({ kind: 'segment_eq', a: ['P', 'R'], b: ['S', 'U'] })

    const state = initState(facts)
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['P', 'Q', 'R'],
      t2: ['S', 'T', 'U'],
    }
    const start = performance.now()
    const r = validateHard(claim, 'congruence_sss', state)
    const elapsed = performance.now() - start
    expect(r.ok).toBe(true)
    // Loose bound — CI hardware varies, we just want to catch a freeze.
    expect(elapsed).toBeLessThan(500)
  })
})

import { describe, expect, it } from 'vitest'
import { canonicalize, factKey, enumerateForms } from '@/lib/geometry-engine/canonical'
import { matchPattern, unify, unifyAny } from '@/lib/geometry-engine/match'
import { CPCTC_ANGLE, SSS } from '@/lib/geometry-engine/lemmas/congruence'
import { tryLemma, initState } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('canonicalize', () => {
  it('segment_eq is order-invariant on endpoints and pair order', () => {
    const a: Fact = { kind: 'segment_eq', a: ['B', 'A'], b: ['D', 'C'] }
    const b: Fact = { kind: 'segment_eq', a: ['C', 'D'], b: ['A', 'B'] }
    expect(factKey(a)).toEqual(factKey(b))
  })

  it('angle_eq treats ray order + pair order as identical', () => {
    const a: Fact = {
      kind: 'angle_eq',
      a: ['A', 'B', 'C'],
      b: ['D', 'E', 'F'],
    }
    const b: Fact = {
      kind: 'angle_eq',
      a: ['F', 'E', 'D'],
      b: ['C', 'B', 'A'],
    }
    expect(factKey(a)).toEqual(factKey(b))
  })

  it('triangle_congruent canonicalises across all 12 alignments', () => {
    // △ABC ≅ △DEF ≡ △BCA ≅ △EFD ≡ △ACB ≅ △DFE ≡ swap
    const a: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'C'],
      t2: ['D', 'E', 'F'],
    }
    const b: Fact = {
      kind: 'triangle_congruent',
      t1: ['B', 'C', 'A'],
      t2: ['E', 'F', 'D'],
    }
    const c: Fact = {
      kind: 'triangle_congruent',
      t1: ['D', 'F', 'E'],
      t2: ['A', 'C', 'B'],
    }
    expect(factKey(a)).toEqual(factKey(b))
    expect(factKey(a)).toEqual(factKey(c))
  })

  it('triangle_congruent distinguishes non-equivalent alignments', () => {
    // A↔D, B↔E, C↔F  vs  A↔D, B↔F, C↔E  — different correspondence.
    const a: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'C'],
      t2: ['D', 'E', 'F'],
    }
    const b: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'C'],
      t2: ['D', 'F', 'E'],
    }
    expect(factKey(a)).not.toEqual(factKey(b))
  })
})

describe('unify', () => {
  it('binds fresh variables', () => {
    const patt: Fact = { kind: 'segment_eq', a: ['X', 'Y'], b: ['U', 'V'] }
    const fact: Fact = { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] }
    const b = unify(patt, fact, {})
    expect(b).toEqual({ X: 'A', Y: 'B', U: 'C', V: 'D' })
  })

  it('rejects inconsistent bindings', () => {
    const patt: Fact = { kind: 'segment_eq', a: ['X', 'X'], b: ['U', 'V'] }
    const fact: Fact = { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] }
    expect(unify(patt, fact, {})).toBeNull()
  })
})

describe('unifyAny', () => {
  it('finds triangle-congruence bindings across symmetry', () => {
    // Fact: △ABD ≅ △ACD (A↔A, B↔C, D↔D)
    const fact: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'D'],
      t2: ['A', 'C', 'D'],
    }
    // Pattern: △XYZ ≅ △UVW with X=A already bound
    const patt: Fact = {
      kind: 'triangle_congruent',
      t1: ['X', 'Y', 'Z'],
      t2: ['U', 'V', 'W'],
    }
    const bindings = unifyAny(patt, fact, { X: 'A' })
    expect(bindings.length).toBeGreaterThan(0)
    const hit = bindings.find(
      (b) => b.X === 'A' && b.Y === 'B' && b.Z === 'D' && b.U === 'A' && b.V === 'C' && b.W === 'D',
    )
    expect(hit).toBeTruthy()
  })
})

describe('SSS end-to-end binding', () => {
  it('proves △ABD ≅ △ACD from AB=AC, BD=DC, AD=AD', () => {
    const state = initState([
      { kind: 'triangle_exists', t: ['A', 'B', 'D'] },
      { kind: 'triangle_exists', t: ['A', 'C', 'D'] },
      { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'C'] },
      { kind: 'segment_eq', a: ['B', 'D'], b: ['C', 'D'] },
      { kind: 'segment_eq', a: ['A', 'D'], b: ['A', 'D'] },
    ])
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'D'],
      t2: ['A', 'C', 'D'],
    }
    const res = tryLemma(claim, SSS, state)
    expect(res.ok).toBe(true)
  })

  it('CPCTC gives ∠ADB = ∠ADC from △ABD ≅ △ACD', () => {
    const state = initState([
      {
        kind: 'triangle_congruent',
        t1: ['A', 'B', 'D'],
        t2: ['A', 'C', 'D'],
      },
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'D', 'B'],
      b: ['A', 'D', 'C'],
    }
    const res = tryLemma(claim, CPCTC_ANGLE, state)
    expect(res.ok).toBe(true)
  })
})

describe('enumerateForms coverage', () => {
  it('every canonical form key matches the canonical form of every enumerated form', () => {
    const facts: Fact[] = [
      { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] },
      { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
      { kind: 'triangle_congruent', t1: ['A', 'B', 'C'], t2: ['D', 'E', 'F'] },
      {
        kind: 'angle_sum',
        angles: [
          ['A', 'B', 'C'],
          ['D', 'E', 'F'],
        ],
        degrees: 180,
      },
      { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
    ]
    for (const f of facts) {
      const key = factKey(f)
      for (const form of enumerateForms(f)) {
        expect(factKey(form)).toEqual(key)
      }
    }
  })

  it('matchPattern respects triangle_congruent symmetry', () => {
    const fact: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'D'],
      t2: ['A', 'C', 'D'],
    }
    const state = initState([fact])
    // The stored (canonical) form of the fact drives matching. Pattern uses
    // fresh vars — expect multiple valid bindings due to symmetry.
    const patt: Fact = {
      kind: 'triangle_congruent',
      t1: ['X', 'Y', 'Z'],
      t2: ['U', 'V', 'W'],
    }
    const results = matchPattern(patt, state.facts, {})
    expect(results.length).toBeGreaterThanOrEqual(6)
  })
})

describe('canonical passes through unchanged', () => {
  it('canonicalize is idempotent', () => {
    const f: Fact = {
      kind: 'triangle_congruent',
      t1: ['Q', 'A', 'M'],
      t2: ['P', 'C', 'M'],
    }
    expect(canonicalize(canonicalize(f))).toEqual(canonicalize(f))
  })
})

describe('matchAll preconditions', () => {
  it('returns no bindings if a required precondition is missing', () => {
    const state = initState([
      { kind: 'triangle_exists', t: ['A', 'B', 'D'] },
      { kind: 'triangle_exists', t: ['A', 'C', 'D'] },
      { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'C'] },
      // missing BD=DC and AD=AD
    ])
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'D'],
      t2: ['A', 'C', 'D'],
    }
    const res = tryLemma(claim, SSS, state)
    expect(res.ok).toBe(false)
  })
})

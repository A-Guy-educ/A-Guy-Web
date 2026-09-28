import { describe, expect, it } from 'vitest'
import { canonicalize } from '@/lib/geometry-engine/canonical'
import { computeDerivedGeometryFacts } from '@/lib/geometry-engine/derive-facts'
import { PROBLEMS } from '@/lib/geometry-engine/problems'
import { specToFacts } from '@/lib/geometry-engine/spec-to-facts'
import type { Fact } from '@/lib/geometry-engine/types'
import { initState, validateEasy } from '@/lib/geometry-engine/validator'

describe('POC problems', () => {
  it('isosceles-median-perp: full proof succeeds via easy mode', () => {
    const problem = PROBLEMS.find((p) => p.id === 'isosceles-median-perp')!
    const parsed = specToFacts(problem.spec)
    const derived = computeDerivedGeometryFacts(parsed.placedPoints)
    const givens = [...parsed.facts, ...problem.extraGivens, ...derived]

    let state = initState(givens)

    const steps: readonly Fact[] = [
      { kind: 'segment_eq', a: ['A', 'D'], b: ['A', 'D'] },
      { kind: 'triangle_congruent', t1: ['A', 'B', 'D'], t2: ['A', 'C', 'D'] },
      { kind: 'angle_eq', a: ['A', 'D', 'B'], b: ['A', 'D', 'C'] },
      {
        kind: 'angle_sum',
        angles: [
          ['A', 'D', 'B'],
          ['A', 'D', 'C'],
        ],
        degrees: 180,
      },
      { kind: 'angle_measure', angle: ['A', 'D', 'B'], degrees: 90 },
      { kind: 'perpendicular', a: ['A', 'D'], b: ['B', 'C'] },
    ]

    for (const claim of steps) {
      const result = validateEasy(claim, state)
      expect(result.ok, `step failed: ${JSON.stringify(claim)}`).toBe(true)
      if (!result.ok) return
      state = result.state
    }

    expect(state.keys.has(JSON.stringify(canonicalize(problem.goal)))).toBe(true)
  })

  it('parallelogram-diagonal-congruent: parses cleanly and goal is not yet in state', () => {
    const problem = PROBLEMS.find((p) => p.id === 'parallelogram-diagonal-congruent')!
    const parsed = specToFacts(problem.spec)
    const derived = computeDerivedGeometryFacts(parsed.placedPoints)
    const givens = [...parsed.facts, ...problem.extraGivens, ...derived]
    const state = initState(givens)
    expect(state.keys.has(JSON.stringify(canonicalize(problem.goal)))).toBe(false)
  })
})

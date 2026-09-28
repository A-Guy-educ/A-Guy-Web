import { describe, expect, it } from 'vitest'
import { canonicalize, factKey } from '@/lib/geometry-engine/canonical'
import { computeDerivedGeometryFacts } from '@/lib/geometry-engine/derive-facts'
import { PROBLEMS, type GeometryProofProblem } from '@/lib/geometry-engine/problems'
import { specToFacts } from '@/lib/geometry-engine/spec-to-facts'
import type { Fact } from '@/lib/geometry-engine/types'
import { initState, validateEasy, type ProofState } from '@/lib/geometry-engine/validator'

function seedState(problem: GeometryProofProblem): ProofState {
  const parsed = specToFacts(problem.spec)
  const derived = computeDerivedGeometryFacts(parsed.placedPoints)
  return initState([...parsed.facts, ...problem.extraGivens, ...derived])
}

function walk(problem: GeometryProofProblem, steps: readonly Fact[]): ProofState {
  let state = seedState(problem)
  for (const claim of steps) {
    const result = validateEasy(claim, state)
    if (!result.ok) {
      throw new Error(`step failed: ${JSON.stringify(claim)} — ${result.reason}`)
    }
    state = result.state
  }
  return state
}

function assertSolved(state: ProofState, goal: Fact) {
  expect(state.keys.has(factKey(canonicalize(goal)))).toBe(true)
}

describe('POC problems: end-to-end proof walks', () => {
  it('isosceles-EF-through-altitude: 3 steps to GE = GF', () => {
    const problem = PROBLEMS.find((p) => p.id === 'isosceles-EF-through-altitude')!
    const state = walk(problem, [
      { kind: 'segment_eq', a: ['A', 'G'], b: ['A', 'G'] },
      { kind: 'triangle_congruent', t1: ['E', 'A', 'G'], t2: ['F', 'A', 'G'] },
      { kind: 'segment_eq', a: ['G', 'E'], b: ['G', 'F'] },
    ])
    assertSolved(state, problem.goal)
  })

  it('parallelogram-diagonal-extension: 5 steps to ∠EDC = ∠FBA', () => {
    const problem = PROBLEMS.find((p) => p.id === 'parallelogram-diagonal-extension')!
    const state = walk(problem, [
      { kind: 'angle_eq', a: ['D', 'A', 'C'], b: ['B', 'C', 'A'] },
      { kind: 'angle_eq', a: ['D', 'A', 'E'], b: ['B', 'C', 'F'] },
      { kind: 'triangle_congruent', t1: ['D', 'A', 'E'], t2: ['B', 'C', 'F'] },
      { kind: 'angle_eq', a: ['A', 'D', 'E'], b: ['C', 'B', 'F'] },
      { kind: 'angle_eq', a: ['E', 'D', 'C'], b: ['F', 'B', 'A'] },
    ])
    assertSolved(state, problem.goal)
  })

  it('parallelogram-long-side-midpoint-bisector: 3 steps to AE bisects ∠BAD', () => {
    const problem = PROBLEMS.find((p) => p.id === 'parallelogram-long-side-midpoint-bisector')!
    const state = walk(problem, [
      { kind: 'angle_eq', a: ['D', 'A', 'E'], b: ['D', 'E', 'A'] },
      { kind: 'angle_eq', a: ['D', 'E', 'A'], b: ['B', 'A', 'E'] },
      { kind: 'angle_eq', a: ['D', 'A', 'E'], b: ['B', 'A', 'E'] },
    ])
    assertSolved(state, problem.goal)
  })
})

describe('POC problems: initial state sanity', () => {
  for (const problem of PROBLEMS) {
    it(`${problem.id}: goal not yet in initial state`, () => {
      const state = seedState(problem)
      expect(state.keys.has(factKey(canonicalize(problem.goal)))).toBe(false)
    })
  }
})

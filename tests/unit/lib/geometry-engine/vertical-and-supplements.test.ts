/**
 * New "supplementary / vertical / equality-class" coverage.
 */
import { describe, expect, it } from 'vitest'
import {
  angleEqualityClasses,
  segmentEqualityClasses,
} from '@/lib/geometry-engine/equality-classes'
import { initState, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('Vertical angles lemma', () => {
  it('AOB collinear + COD collinear ⇒ ∠AOC = ∠BOD', () => {
    const state = initState([
      { kind: 'between', a: 'A', m: 'O', b: 'B' },
      { kind: 'between', a: 'C', m: 'O', b: 'D' },
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'O', 'C'],
      b: ['B', 'O', 'D'],
    }
    const r = validateHard(claim, 'vertical_angles', state)
    expect(r.ok).toBe(true)
  })

  it('rejects when a required collinearity is missing', () => {
    const state = initState([
      { kind: 'between', a: 'A', m: 'O', b: 'B' },
      // no C-O-D
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'O', 'C'],
      b: ['B', 'O', 'D'],
    }
    const r = validateHard(claim, 'vertical_angles', state)
    expect(r.ok).toBe(false)
  })
})

describe('Supplements of the same angle lemma', () => {
  it('∠α+∠β=180 ∧ ∠γ+∠β=180 ⇒ ∠α=∠γ', () => {
    const state = initState([
      {
        kind: 'angle_sum',
        angles: [
          ['A', 'O', 'C'],
          ['A', 'O', 'D'],
        ],
        degrees: 180,
      },
      {
        kind: 'angle_sum',
        angles: [
          ['B', 'O', 'C'],
          ['A', 'O', 'D'],
        ],
        degrees: 180,
      },
    ])
    const claim: Fact = {
      kind: 'angle_eq',
      a: ['A', 'O', 'C'],
      b: ['B', 'O', 'C'],
    }
    const r = validateHard(claim, 'supplements_of_same_angle', state)
    expect(r.ok).toBe(true)
  })
})

describe('Equality-class computation for visual marks', () => {
  it('groups AB=CD and CD=EF into one class', () => {
    const facts: Fact[] = [
      { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] },
      { kind: 'segment_eq', a: ['C', 'D'], b: ['E', 'F'] },
    ]
    const c = segmentEqualityClasses(facts)
    expect(c.classOf.get('A,B')).toBe(0)
    expect(c.classOf.get('C,D')).toBe(0)
    expect(c.classOf.get('E,F')).toBe(0)
  })

  it('assigns distinct class indices to independent equalities', () => {
    const facts: Fact[] = [
      { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] },
      { kind: 'segment_eq', a: ['E', 'F'], b: ['G', 'H'] },
    ]
    const c = segmentEqualityClasses(facts)
    expect(c.classOf.get('A,B')).toBe(0)
    expect(c.classOf.get('C,D')).toBe(0)
    expect(c.classOf.get('E,F')).toBe(1)
    expect(c.classOf.get('G,H')).toBe(1)
  })

  it('assigns angle class indices with vertex-preserved keys', () => {
    const facts: Fact[] = [{ kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] }]
    const angles = angleEqualityClasses(facts)
    expect(angles.length).toBe(2)
    expect(angles[0]!.vertex).toBe('B')
    expect(angles[1]!.vertex).toBe('E')
    expect(angles[0]!.classIdx).toBe(0)
    expect(angles[1]!.classIdx).toBe(0)
  })

  it('ignores segments that are only self-equal', () => {
    const facts: Fact[] = [
      { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'B'] }, // reflexive
    ]
    const c = segmentEqualityClasses(facts)
    // A single segment (even paired with itself) shouldn't be marked.
    expect(c.classOf.size).toBe(0)
  })
})

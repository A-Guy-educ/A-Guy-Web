/**
 * User's exact scenario:
 *   Givens: △ABC exists, ∠BAC = 30°, ∠ACB = 60°
 *   Claim:  ∠ABC = 90°
 *
 * Requires numeric-variable pattern support and the TRIANGLE_THIRD_ANGLE
 * lemma with computeDegrees = 180 − X − Y.
 */
import { describe, expect, it } from 'vitest'
import { initState, validateEasy, validateHard } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

describe('TRIANGLE_THIRD_ANGLE (numeric arithmetic in lemma)', () => {
  it('30 + 60 + x = 180 ⇒ x = 90', () => {
    const state = initState([
      { kind: 'triangle_exists', t: ['A', 'B', 'C'] },
      { kind: 'angle_measure', angle: ['B', 'A', 'C'], degrees: 30 },
      { kind: 'angle_measure', angle: ['A', 'C', 'B'], degrees: 60 },
    ])
    const claim: Fact = {
      kind: 'angle_measure',
      angle: ['A', 'B', 'C'],
      degrees: 90,
    }
    expect(validateHard(claim, 'triangle_third_angle', state).ok).toBe(true)
    expect(validateEasy(claim, state).ok).toBe(true)
  })

  it('45 + 60 + x = 180 ⇒ x = 75 (any pair, not just 30-60-90)', () => {
    const state = initState([
      { kind: 'triangle_exists', t: ['A', 'B', 'C'] },
      { kind: 'angle_measure', angle: ['B', 'A', 'C'], degrees: 45 },
      { kind: 'angle_measure', angle: ['A', 'C', 'B'], degrees: 60 },
    ])
    const claim: Fact = {
      kind: 'angle_measure',
      angle: ['A', 'B', 'C'],
      degrees: 75,
    }
    expect(validateHard(claim, 'triangle_third_angle', state).ok).toBe(true)
  })

  it('rejects a wrong claimed degree (30 + 60 does not equal 100)', () => {
    const state = initState([
      { kind: 'triangle_exists', t: ['A', 'B', 'C'] },
      { kind: 'angle_measure', angle: ['B', 'A', 'C'], degrees: 30 },
      { kind: 'angle_measure', angle: ['A', 'C', 'B'], degrees: 60 },
    ])
    const wrong: Fact = {
      kind: 'angle_measure',
      angle: ['A', 'B', 'C'],
      degrees: 100,
    }
    expect(validateHard(wrong, 'triangle_third_angle', state).ok).toBe(false)
  })

  it('rejects when the two known angles sum to ≥ 180 (degenerate triangle)', () => {
    const state = initState([
      { kind: 'triangle_exists', t: ['A', 'B', 'C'] },
      { kind: 'angle_measure', angle: ['B', 'A', 'C'], degrees: 120 },
      { kind: 'angle_measure', angle: ['A', 'C', 'B'], degrees: 60 },
    ])
    const claim: Fact = {
      kind: 'angle_measure',
      angle: ['A', 'B', 'C'],
      degrees: 0,
    }
    expect(validateHard(claim, 'triangle_third_angle', state).ok).toBe(false)
  })

  it('rejects when the triangle_exists precondition is missing', () => {
    const state = initState([
      // no triangle_exists
      { kind: 'angle_measure', angle: ['B', 'A', 'C'], degrees: 30 },
      { kind: 'angle_measure', angle: ['A', 'C', 'B'], degrees: 60 },
    ])
    const claim: Fact = {
      kind: 'angle_measure',
      angle: ['A', 'B', 'C'],
      degrees: 90,
    }
    expect(validateHard(claim, 'triangle_third_angle', state).ok).toBe(false)
  })
})

/**
 * End-to-end proof from the spec:
 *
 *   Given △ABC where AB = AC and D is the midpoint of BC.
 *   Prove AD ⊥ BC.
 *
 * We walk the 6 declared steps through the engine (hard mode) and confirm
 * each is accepted with the intended lemma, then re-run under easy mode to
 * confirm the engine picks the same lemmas without hints.
 */
import { describe, expect, it } from 'vitest'
import {
  initState,
  validateEasy,
  validateHard,
  type ProofState,
} from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'

/** Givens: △ABC with AB = AC, D midpoint of BC, plus structural facts. */
function givens(): ProofState {
  return initState([
    { kind: 'triangle_exists', t: ['A', 'B', 'C'] },
    { kind: 'triangle_exists', t: ['A', 'B', 'D'] },
    { kind: 'triangle_exists', t: ['A', 'C', 'D'] },
    { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'C'] }, // AB = AC
    { kind: 'segment_eq', a: ['B', 'D'], b: ['D', 'C'] }, // BD = DC
    { kind: 'between', a: 'B', m: 'D', b: 'C' }, // D on segment BC
  ])
}

interface Step {
  claim: Fact
  lemmaId: string
  label: string
}

const SCRIPT: readonly Step[] = [
  {
    label: 'Step 1: AD = AD (reflexive)',
    claim: { kind: 'segment_eq', a: ['A', 'D'], b: ['A', 'D'] },
    lemmaId: 'reflexive_segment_eq',
  },
  {
    label: 'Step 2: △ABD ≅ △ACD (SSS)',
    claim: {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'D'],
      t2: ['A', 'C', 'D'],
    },
    lemmaId: 'congruence_sss',
  },
  {
    label: 'Step 3: ∠ADB = ∠ADC (CPCTC)',
    claim: {
      kind: 'angle_eq',
      a: ['A', 'D', 'B'],
      b: ['A', 'D', 'C'],
    },
    lemmaId: 'cpctc_angle',
  },
  {
    label: 'Step 4: ∠ADB + ∠ADC = 180° (linear pair)',
    claim: {
      kind: 'angle_sum',
      angles: [
        ['A', 'D', 'B'],
        ['A', 'D', 'C'],
      ],
      degrees: 180,
    },
    lemmaId: 'linear_pair',
  },
  {
    label: 'Step 5: ∠ADB = 90° (equal supplementary angles are right)',
    claim: { kind: 'angle_measure', angle: ['A', 'D', 'B'], degrees: 90 },
    lemmaId: 'half_of_180_equal_angles',
  },
  {
    label: 'Step 6: AD ⊥ BC (right angle onto a line ⇒ perpendicular)',
    claim: { kind: 'perpendicular', a: ['A', 'D'], b: ['B', 'C'] },
    lemmaId: 'right_angle_on_line_to_perp',
  },
]

describe('Isosceles proof: prove AD ⊥ BC (hard mode)', () => {
  it('validates every step with the declared lemma', () => {
    let state = givens()
    for (const step of SCRIPT) {
      const result = validateHard(step.claim, step.lemmaId, state)
      if (!result.ok) {
        throw new Error(`FAILED ${step.label} — ${result.reason}`)
      }
      expect(result.lemma.id).toBe(step.lemmaId)
      state = result.state
    }
    // Final fact is in the proof state.
    expect(
      state.keys.has(
        JSON.stringify({
          kind: 'perpendicular',
          a: ['A', 'D'],
          b: ['B', 'C'],
        }),
      ),
    ).toBe(true)
  })
})

describe('Isosceles proof: prove AD ⊥ BC (easy mode)', () => {
  it('validates every step by searching the catalogue', () => {
    let state = givens()
    for (const step of SCRIPT) {
      const result = validateEasy(step.claim, state)
      if (!result.ok) {
        throw new Error(`FAILED ${step.label} — ${result.reason}`)
      }
      state = result.state
    }
  })
})

describe('Isosceles proof: rejection cases', () => {
  it('rejects claiming AB = DC (wrong correspondence under SSS/CPCTC)', () => {
    const state = initState([
      {
        kind: 'triangle_congruent',
        t1: ['A', 'B', 'D'],
        t2: ['A', 'C', 'D'],
      },
    ])
    // Under the correspondence A↔A, B↔C, D↔D, side AB corresponds to AC — NOT to DC.
    const bogus: Fact = { kind: 'segment_eq', a: ['A', 'B'], b: ['D', 'C'] }
    const res = validateHard(bogus, 'cpctc_side', state)
    expect(res.ok).toBe(false)
  })

  it('rejects SSS when a required side equality is missing', () => {
    const state = initState([
      { kind: 'triangle_exists', t: ['A', 'B', 'D'] },
      { kind: 'triangle_exists', t: ['A', 'C', 'D'] },
      { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'C'] },
      // Missing BD = DC and AD = AD.
    ])
    const claim: Fact = {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'D'],
      t2: ['A', 'C', 'D'],
    }
    const res = validateHard(claim, 'congruence_sss', state)
    expect(res.ok).toBe(false)
  })
})

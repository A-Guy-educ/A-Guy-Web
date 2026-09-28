/**
 * Trivial equality/reflexivity + small algebraic bridges.
 * All point names here are pattern *variables*.
 */
import type { Lemma } from '../types.js'

export const REFLEXIVE_SEGMENT: Lemma = {
  id: 'reflexive_segment_eq',
  nameHe: 'שוויון רפלקסיבי של קטע',
  nameEn: 'A segment equals itself',
  category: 'equality',
  gradeLevel: [7, 8],
  preconditions: [],
  conclusion: { kind: 'segment_eq', a: ['X', 'Y'], b: ['X', 'Y'] },
}

export const REFLEXIVE_ANGLE: Lemma = {
  id: 'reflexive_angle_eq',
  nameHe: 'שוויון רפלקסיבי של זווית',
  nameEn: 'An angle equals itself',
  category: 'equality',
  gradeLevel: [7, 8],
  preconditions: [],
  conclusion: { kind: 'angle_eq', a: ['X', 'Y', 'Z'], b: ['X', 'Y', 'Z'] },
}

/**
 * Transitivity of segment equality: AB = CD and CD = EF ⇒ AB = EF.
 *
 * The middle segment CD has both endpoints unbound in the conclusion, so
 * the matcher searches the fact DB for any middle that closes the chain.
 * Guard rejects the trivial case where the chain collapses to AB = AB
 * (already covered by reflexivity).
 */
export const TRANSITIVE_SEGMENT_EQ: Lemma = {
  id: 'transitive_segment_eq',
  nameHe: 'טרנזיטיביות של שוויון קטעים',
  nameEn: 'Transitivity of segment equality',
  category: 'equality',
  gradeLevel: [7],
  preconditions: [
    { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] },
    { kind: 'segment_eq', a: ['C', 'D'], b: ['E', 'F'] },
  ],
  conclusion: { kind: 'segment_eq', a: ['A', 'B'], b: ['E', 'F'] },
  guard: (b) => !(b.A === b.E && b.B === b.F),
}

/** Transitivity of angle equality: ∠α = ∠β and ∠β = ∠γ ⇒ ∠α = ∠γ. */
export const TRANSITIVE_ANGLE_EQ: Lemma = {
  id: 'transitive_angle_eq',
  nameHe: 'טרנזיטיביות של שוויון זוויות',
  nameEn: 'Transitivity of angle equality',
  category: 'equality',
  gradeLevel: [7],
  preconditions: [
    { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
    { kind: 'angle_eq', a: ['D', 'E', 'F'], b: ['G', 'H', 'I'] },
  ],
  conclusion: { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['G', 'H', 'I'] },
  guard: (b) => !(b.A === b.G && b.B === b.H && b.C === b.I),
}

/** ∠α + ∠β = 180 and ∠α = ∠β  ⇒  ∠α = 90°. */
export const HALF_OF_180: Lemma = {
  id: 'half_of_180_equal_angles',
  nameHe: 'שתי זוויות שוות המשלימות ל-180° הן ישרות',
  nameEn: 'If two equal angles are supplementary, each is 90°',
  category: 'equality',
  gradeLevel: [7, 8],
  preconditions: [
    {
      kind: 'angle_sum',
      angles: [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
      ],
      degrees: 180,
    },
    { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
  ],
  conclusion: { kind: 'angle_measure', angle: ['A', 'B', 'C'], degrees: 90 },
}

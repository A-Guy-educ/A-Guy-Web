/**
 * Lemmas about angles that don't need triangles.
 * Corresponds to list.pdf items #1, #2 (partial), #12, #13 and the
 * "perpendicular ⇔ 90°" bridge.
 */
import type { Lemma } from '../types.js'

/**
 * List.pdf #1: adjacent angles on a straight line sum to 180°.
 *
 * If D is a point between B and C on segment BC, then for any point A,
 * ∠ADB + ∠ADC = 180°.
 */
export const LINEAR_PAIR: Lemma = {
  id: 'linear_pair',
  nameHe: 'זוויות צמודות משלימות ל-180°',
  nameEn: 'Adjacent angles on a straight line sum to 180°',
  category: 'angles',
  gradeLevel: [7],
  preconditions: [{ kind: 'between', a: 'B', m: 'D', b: 'C' }],
  conclusion: {
    kind: 'angle_sum',
    angles: [
      ['A', 'D', 'B'],
      ['A', 'D', 'C'],
    ],
    degrees: 180,
  },
  guard: (b) => b.A !== b.D && b.A !== b.B && b.A !== b.C,
}

/**
 * List.pdf #12 (numeric form): given two known angles of a triangle,
 * derive the third from `∠A + ∠B + ∠C = 180°`.
 *
 * The two known-angle preconditions bind their degrees to numeric
 * variables X and Y; the conclusion's degrees is a variable Z that
 * unifies with the student's claim; and `computeDegrees` verifies that
 * Z = 180 − X − Y.
 */
export const TRIANGLE_THIRD_ANGLE: Lemma = {
  id: 'triangle_third_angle',
  nameHe: 'הזווית השלישית במשולש',
  nameEn: 'Third angle of a triangle from two known angles (180° sum)',
  category: 'angles',
  gradeLevel: [7],
  preconditions: [
    { kind: 'triangle_exists', t: ['A', 'B', 'C'] },
    { kind: 'angle_measure', angle: ['B', 'A', 'C'], degrees: 'X' },
    { kind: 'angle_measure', angle: ['A', 'C', 'B'], degrees: 'Y' },
  ],
  conclusion: {
    kind: 'angle_measure',
    angle: ['A', 'B', 'C'],
    degrees: 'Z',
  },
  computeDegrees: (b) => {
    const x = b.X
    const y = b.Y
    if (typeof x !== 'number' || typeof y !== 'number') return undefined
    const z = 180 - x - y
    // Reject nonsensical triangles.
    if (z <= 0 || z >= 180) return undefined
    return z
  },
  guard: (b) => new Set([b.A, b.B, b.C]).size === 3,
}

/**
 * List.pdf #12: sum of triangle angles is 180°.
 */
export const TRIANGLE_ANGLE_SUM: Lemma = {
  id: 'triangle_angle_sum',
  nameHe: 'סכום זוויות המשולש הוא 180°',
  nameEn: 'The angles of a triangle sum to 180°',
  category: 'angles',
  gradeLevel: [7],
  preconditions: [{ kind: 'triangle_exists', t: ['A', 'B', 'C'] }],
  conclusion: {
    kind: 'angle_sum',
    angles: [
      ['B', 'A', 'C'],
      ['A', 'B', 'C'],
      ['B', 'C', 'A'],
    ],
    degrees: 180,
  },
}

/** ∠ABC = 90°  ⇒  AB ⊥ BC. */
export const RIGHT_ANGLE_TO_PERP: Lemma = {
  id: 'right_angle_to_perp',
  nameHe: 'זווית של 90° יוצרת אנך',
  nameEn: 'A 90° angle implies perpendicularity of its rays',
  category: 'angles',
  gradeLevel: [7],
  preconditions: [{ kind: 'angle_measure', angle: ['A', 'B', 'C'], degrees: 90 }],
  conclusion: { kind: 'perpendicular', a: ['A', 'B'], b: ['B', 'C'] },
}

/**
 * List.pdf #2: vertical angles are equal.
 *
 * Setup: two straight lines cross at O. Line 1 goes through A—O—B,
 * line 2 through C—O—D. Then ∠AOC and ∠BOD are vertical (opposite)
 * angles, hence equal.
 */
export const VERTICAL_ANGLES: Lemma = {
  id: 'vertical_angles',
  nameHe: 'זוויות קדקודיות שוות',
  nameEn: 'Vertical angles are equal',
  category: 'angles',
  gradeLevel: [7],
  preconditions: [
    { kind: 'between', a: 'A', m: 'O', b: 'B' },
    { kind: 'between', a: 'C', m: 'O', b: 'D' },
  ],
  conclusion: { kind: 'angle_eq', a: ['A', 'O', 'C'], b: ['B', 'O', 'D'] },
  guard: (b) => new Set([b.A, b.B, b.C, b.D, b.O]).size === 5,
}

/**
 * General "supplements of equal angles are equal" — the fully general
 * version. Given two supplementary pairs (α + β = 180 and γ + δ = 180)
 * with β = δ, conclude α = γ.
 *
 * The SUPPLEMENTS_OF_SAME_ANGLE lemma below is the special case where
 * β = δ literally (same fact). This general form covers the common
 * "alternate interior angles equal ⇒ their exterior supplements are
 * equal" pattern that shows up whenever you jump from an interior
 * equality to an exterior one via linear pairs at each intersection.
 */
export const SUPPLEMENTS_OF_EQUAL_ANGLES: Lemma = {
  id: 'supplements_of_equal_angles',
  nameHe: 'משלימים ל-180° של זוויות שוות שווים זה לזה',
  nameEn: 'Supplements of equal angles are equal',
  category: 'angles',
  gradeLevel: [7],
  preconditions: [
    {
      kind: 'angle_sum',
      angles: [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
      ],
      degrees: 180,
    },
    {
      kind: 'angle_sum',
      angles: [
        ['G', 'H', 'I'],
        ['J', 'K', 'L'],
      ],
      degrees: 180,
    },
    { kind: 'angle_eq', a: ['D', 'E', 'F'], b: ['J', 'K', 'L'] },
  ],
  conclusion: { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['G', 'H', 'I'] },
  guard: (b) => !(b.A === b.G && b.B === b.H && b.C === b.I),
}

/**
 * Supplements of the same angle are equal.
 *
 * If ∠α + ∠β = 180 and ∠γ + ∠β = 180 (same ∠β), then ∠α = ∠γ.
 * Special case of SUPPLEMENTS_OF_EQUAL_ANGLES — the "equal middle" is
 * reflexive here so the third precondition can be dropped.
 */
export const SUPPLEMENTS_OF_SAME_ANGLE: Lemma = {
  id: 'supplements_of_same_angle',
  nameHe: 'משלימים ל-180° של אותה זווית שווים זה לזה',
  nameEn: 'Supplements of the same angle are equal',
  category: 'angles',
  gradeLevel: [7],
  preconditions: [
    {
      kind: 'angle_sum',
      angles: [
        ['A', 'B', 'C'],
        ['X', 'Y', 'Z'],
      ],
      degrees: 180,
    },
    {
      kind: 'angle_sum',
      angles: [
        ['G', 'H', 'I'],
        ['X', 'Y', 'Z'],
      ],
      degrees: 180,
    },
  ],
  conclusion: { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['G', 'H', 'I'] },
  guard: (b) => !(b.A === b.G && b.B === b.H && b.C === b.I),
}

/**
 * Compound lemma: if two collinear points F and D on a straight line
 * A—F—D—B have equal "inner" angles (∠CFD = ∠EDF, sharing the FD
 * segment), then their "outer" angles are also equal (∠AFC = ∠BDE).
 *
 * Baked-in derivation:
 *   ∠AFC + ∠CFD = 180  (linear pair at F, since A-F-D are collinear)
 *   ∠BDE + ∠EDF = 180  (linear pair at D, since F-D-B are collinear)
 *   ∠CFD = ∠EDF        (given)
 *   ⇒ ∠AFC = ∠BDE
 *
 * Saves the student three intermediate `angle_sum([·, ·], 180)` steps
 * that would otherwise be needed to invoke supplements_of_equal_angles.
 * Works for C and E on either side of the line — the linear-pair
 * derivation at each vertex is agnostic to which side the "off-line"
 * point sits on.
 */
export const LINEAR_PAIR_JUMP: Lemma = {
  id: 'linear_pair_jump',
  nameHe: 'זוויות משלימות ל-180° על ישר משתי צדדים שוות זו לזו',
  nameEn: 'Equal inner angles at two collinear points imply equal outer angles',
  category: 'angles',
  gradeLevel: [7, 8],
  preconditions: [
    { kind: 'between', a: 'A', m: 'F', b: 'D' },
    { kind: 'between', a: 'F', m: 'D', b: 'B' },
    {
      kind: 'angle_eq',
      a: ['C', 'F', 'D'],
      b: ['E', 'D', 'F'],
    },
  ],
  conclusion: {
    kind: 'angle_eq',
    a: ['A', 'F', 'C'],
    b: ['B', 'D', 'E'],
  },
  guard: (b) =>
    new Set([b.A, b.F, b.D, b.B]).size === 4 &&
    b.C !== b.F &&
    b.C !== b.D &&
    b.E !== b.F &&
    b.E !== b.D,
}

/**
 * Angle addition: if two angles at different vertices are decomposed
 * into pairwise equal parts, the wholes are equal.
 *
 * Precondition semantics:
 *   ray_between(V, A, M, B)  — at V, ray VM is inside ∠AVB
 *   ray_between(W, C, N, D)  — at W, ray WN is inside ∠CWD
 * If ∠AVM = ∠CWN and ∠MVB = ∠NWD, then ∠AVB = ∠CWD.
 *
 * The `ray_between` structural facts are what the student adds by
 * reading the diagram — the engine has no coordinate model, so it can't
 * derive them on its own.
 */
export const ANGLE_ADDITION_EQ: Lemma = {
  id: 'angle_addition_eq',
  nameHe: 'חיבור זוויות',
  nameEn: 'Angle addition: equal parts give equal wholes',
  category: 'angles',
  gradeLevel: [7, 8],
  preconditions: [
    { kind: 'ray_between', vertex: 'V', a: 'A', m: 'M', b: 'B' },
    { kind: 'ray_between', vertex: 'W', a: 'C', m: 'N', b: 'D' },
    { kind: 'angle_eq', a: ['A', 'V', 'M'], b: ['C', 'W', 'N'] },
    { kind: 'angle_eq', a: ['M', 'V', 'B'], b: ['N', 'W', 'D'] },
  ],
  conclusion: { kind: 'angle_eq', a: ['A', 'V', 'B'], b: ['C', 'W', 'D'] },
}

/**
 * Bridge from "A—D—B collinear" + right angle to perpendicular of the full
 * segment BC.
 *
 * If between(B, D, C) and ∠ADB = 90°, then AD ⊥ BC.
 */
export const RIGHT_ANGLE_ON_LINE_TO_PERP: Lemma = {
  id: 'right_angle_on_line_to_perp',
  nameHe: 'זווית של 90° בין קטע לישר',
  nameEn: 'A 90° angle onto a line implies perpendicularity to that line',
  category: 'angles',
  gradeLevel: [7],
  preconditions: [
    { kind: 'between', a: 'B', m: 'D', b: 'C' },
    { kind: 'angle_measure', angle: ['A', 'D', 'B'], degrees: 90 },
  ],
  conclusion: { kind: 'perpendicular', a: ['A', 'D'], b: ['B', 'C'] },
  guard: (b) => b.A !== b.D && b.A !== b.B && b.A !== b.C,
}

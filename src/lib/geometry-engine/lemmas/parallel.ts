/**
 * Parallel-line lemmas from list.pdf #22–#25 (subset).
 *
 * Setup we model: line AB is parallel to line CD; the transversal passes
 * through P (strictly between A and B) and Q (strictly between C and D).
 * Under this labelling ∠APQ and ∠DQP are *alternate interior* angles.
 *
 * Modelling caveat: in the general theorem A/B on one parallel line and
 * C/D on the other can appear in either order relative to the transversal
 * side. Our lemma fixes a canonical labelling — students who choose a
 * different letter order can still express the same fact by relabelling.
 */
import type { Lemma } from '../types.js'

/**
 * #25b: parallel lines cut by a transversal ⇒ alternate interior angles
 * equal.
 */
export const PARALLEL_TO_ALTERNATE_ANGLES: Lemma = {
  id: 'parallel_to_alternate_angles',
  nameHe: 'ישרים מקבילים יוצרים זוויות מתחלפות שוות',
  nameEn: 'Parallel lines make alternate interior angles equal',
  category: 'parallel',
  gradeLevel: [7, 8],
  preconditions: [
    { kind: 'parallel', a: ['A', 'B'], b: ['C', 'D'] },
    { kind: 'between', a: 'A', m: 'P', b: 'B' }, // P strictly on AB
    { kind: 'between', a: 'C', m: 'Q', b: 'D' }, // Q strictly on CD
  ],
  conclusion: { kind: 'angle_eq', a: ['A', 'P', 'Q'], b: ['D', 'Q', 'P'] },
  guard: (b) => b.P !== b.Q,
}

/**
 * Companion to PARALLEL_TO_ALTERNATE_ANGLES for the very common case where
 * the transversal passes through the *endpoints* of the two parallel
 * segments rather than through strict interior points.
 *
 * Setup: line XY ∥ line ZW. The transversal is the single segment YZ (Y
 * is the shared endpoint on line 1, Z is the shared endpoint on line 2).
 * Alternate interior angles: ∠XYZ at Y (between the far end of line 1
 * and the transversal) and ∠WZY at Z (between the far end of line 2 and
 * the transversal, on the opposite side).
 *
 * Typical use: the two opposite sides of a parallelogram + a diagonal.
 */
export const PARALLEL_ALTERNATE_AT_ENDPOINTS: Lemma = {
  id: 'parallel_alternate_at_endpoints',
  nameHe: 'זוויות מתחלפות שוות (חוצה בין קצוות)',
  nameEn: 'Alternate interior angles when the transversal joins segment endpoints',
  category: 'parallel',
  gradeLevel: [7, 8],
  preconditions: [{ kind: 'parallel', a: ['X', 'Y'], b: ['Z', 'W'] }],
  conclusion: { kind: 'angle_eq', a: ['X', 'Y', 'Z'], b: ['W', 'Z', 'Y'] },
  guard: (b) => new Set([b.X, b.Y, b.Z, b.W]).size === 4,
}

/** #23 converse: alternate interior angles equal ⇒ lines parallel. */
export const ALTERNATE_ANGLES_TO_PARALLEL: Lemma = {
  id: 'alternate_angles_to_parallel',
  nameHe: 'זוויות מתחלפות שוות ⇐ הישרים מקבילים',
  nameEn: 'Equal alternate interior angles imply parallel lines',
  category: 'parallel',
  gradeLevel: [7, 8],
  preconditions: [
    { kind: 'between', a: 'A', m: 'P', b: 'B' },
    { kind: 'between', a: 'C', m: 'Q', b: 'D' },
    { kind: 'angle_eq', a: ['A', 'P', 'Q'], b: ['D', 'Q', 'P'] },
  ],
  conclusion: { kind: 'parallel', a: ['A', 'B'], b: ['C', 'D'] },
  guard: (b) => b.P !== b.Q,
}

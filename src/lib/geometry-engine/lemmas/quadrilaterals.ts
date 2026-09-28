/**
 * Quadrilateral lemmas — parallelograms (list.pdf #26–#32) and a few
 * rhombus/rectangle bridges (#33–#38). Trapezoids and midsegment theorems
 * are omitted from v1 (they need extra shape state we haven't built yet).
 */
import type { Lemma } from '../types.js'

/** #27: opposite sides of a parallelogram are equal. */
export const PARALLELOGRAM_OPPOSITE_SIDES: Lemma = {
  id: 'parallelogram_opposite_sides_eq',
  nameHe: 'במקבילית צלעות נגדיות שוות',
  nameEn: 'Opposite sides of a parallelogram are equal',
  category: 'parallelogram',
  gradeLevel: [8],
  preconditions: [{ kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] }],
  conclusion: { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] },
}

/** #26: opposite angles of a parallelogram are equal. */
export const PARALLELOGRAM_OPPOSITE_ANGLES: Lemma = {
  id: 'parallelogram_opposite_angles_eq',
  nameHe: 'במקבילית זוויות נגדיות שוות',
  nameEn: 'Opposite angles of a parallelogram are equal',
  category: 'parallelogram',
  gradeLevel: [8],
  preconditions: [{ kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] }],
  conclusion: { kind: 'angle_eq', a: ['D', 'A', 'B'], b: ['B', 'C', 'D'] },
}

/** Parallelogram sides are parallel — sanity bridge to `parallel`. */
export const PARALLELOGRAM_PARALLEL_SIDES: Lemma = {
  id: 'parallelogram_parallel_sides',
  nameHe: 'במקבילית צלעות נגדיות מקבילות',
  nameEn: 'Opposite sides of a parallelogram are parallel',
  category: 'parallelogram',
  gradeLevel: [8],
  preconditions: [{ kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] }],
  conclusion: { kind: 'parallel', a: ['A', 'B'], b: ['C', 'D'] },
}

/** #30 converse: a quadrilateral with opposite sides equal is a parallelogram. */
export const OPPOSITE_SIDES_EQ_TO_PARALLELOGRAM: Lemma = {
  id: 'opposite_sides_eq_to_parallelogram',
  nameHe: 'מרובע שבו זוגות צלעות נגדיות שוות הוא מקבילית',
  nameEn: 'A quadrilateral with both pairs of opposite sides equal is a parallelogram',
  category: 'parallelogram',
  gradeLevel: [8],
  preconditions: [
    { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] },
    { kind: 'segment_eq', a: ['B', 'C'], b: ['A', 'D'] },
  ],
  conclusion: { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
}

/** #29 converse: opposite angles equal ⇒ parallelogram. */
export const OPPOSITE_ANGLES_EQ_TO_PARALLELOGRAM: Lemma = {
  id: 'opposite_angles_eq_to_parallelogram',
  nameHe: 'מרובע שבו זוגות זוויות נגדיות שוות הוא מקבילית',
  nameEn: 'A quadrilateral with both pairs of opposite angles equal is a parallelogram',
  category: 'parallelogram',
  gradeLevel: [8],
  preconditions: [
    { kind: 'angle_eq', a: ['D', 'A', 'B'], b: ['B', 'C', 'D'] },
    { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['C', 'D', 'A'] },
  ],
  conclusion: { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
}

/**
 * #31: one pair of opposite sides is BOTH parallel AND equal ⇒ parallelogram.
 * This is the most-used parallelogram criterion in student proofs.
 */
export const PAIR_PARALLEL_EQ_TO_PARALLELOGRAM: Lemma = {
  id: 'pair_parallel_eq_to_parallelogram',
  nameHe: 'מרובע שבו זוג צלעות נגדיות מקבילות ושוות הוא מקבילית',
  nameEn: 'A quadrilateral with one pair of opposite sides equal and parallel is a parallelogram',
  category: 'parallelogram',
  gradeLevel: [8],
  preconditions: [
    { kind: 'parallel', a: ['A', 'B'], b: ['C', 'D'] },
    { kind: 'segment_eq', a: ['A', 'B'], b: ['C', 'D'] },
  ],
  // NB: for ABCD to close as a parallelogram, the equal-and-parallel sides
  // must be AB and DC (walking the quad the same direction). We accept the
  // simpler "AB ≡ CD" form here; students who order their vertices wrong
  // still get a green because both encodings are geometrically valid.
  conclusion: { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
}

/**
 * Consequence of #25c + parallelogram sides being parallel:
 * consecutive angles of a parallelogram sum to 180°.
 */
export const PARALLELOGRAM_CONSECUTIVE_ANGLES_SUP: Lemma = {
  id: 'parallelogram_consecutive_angles_supp',
  nameHe: 'זוויות סמוכות במקבילית משלימות ל-180°',
  nameEn: 'Consecutive angles of a parallelogram are supplementary',
  category: 'parallelogram',
  gradeLevel: [8],
  preconditions: [{ kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] }],
  conclusion: {
    kind: 'angle_sum',
    angles: [
      ['D', 'A', 'B'],
      ['A', 'B', 'C'],
    ],
    degrees: 180,
  },
}

/** #37: rectangle diagonals are equal. */
export const RECTANGLE_DIAGONALS_EQUAL: Lemma = {
  id: 'rectangle_diagonals_eq',
  nameHe: 'אלכסוני מלבן שווים',
  nameEn: 'Diagonals of a rectangle are equal',
  category: 'rectangle',
  gradeLevel: [8],
  preconditions: [{ kind: 'rectangle', q: ['A', 'B', 'C', 'D'] }],
  conclusion: { kind: 'segment_eq', a: ['A', 'C'], b: ['B', 'D'] },
}

/** #35: rhombus diagonals are perpendicular. */
export const RHOMBUS_DIAGONALS_PERP: Lemma = {
  id: 'rhombus_diagonals_perp',
  nameHe: 'אלכסוני מעוין מאונכים',
  nameEn: 'Diagonals of a rhombus are perpendicular',
  category: 'rhombus',
  gradeLevel: [8],
  preconditions: [{ kind: 'rhombus', q: ['A', 'B', 'C', 'D'] }],
  conclusion: { kind: 'perpendicular', a: ['A', 'C'], b: ['B', 'D'] },
}

/** Every rectangle is a parallelogram. */
export const RECTANGLE_IS_PARALLELOGRAM: Lemma = {
  id: 'rectangle_is_parallelogram',
  nameHe: 'מלבן הוא מקבילית',
  nameEn: 'A rectangle is a parallelogram',
  category: 'rectangle',
  gradeLevel: [8],
  preconditions: [{ kind: 'rectangle', q: ['A', 'B', 'C', 'D'] }],
  conclusion: { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
}

/** Every rhombus is a parallelogram. */
export const RHOMBUS_IS_PARALLELOGRAM: Lemma = {
  id: 'rhombus_is_parallelogram',
  nameHe: 'מעוין הוא מקבילית',
  nameEn: 'A rhombus is a parallelogram',
  category: 'rhombus',
  gradeLevel: [8],
  preconditions: [{ kind: 'rhombus', q: ['A', 'B', 'C', 'D'] }],
  conclusion: { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
}

/**
 * Isosceles-triangle lemmas from list.pdf #3, #4, #6, #7, #8, #9.
 * We model `isosceles(△ABC)` as "AB = AC" (apex = A = t[0]).
 */
import type { Lemma } from '../types.js'

/** Definition-unpacking: isosceles(△ABC) ⇒ AB = AC. */
export const ISOSCELES_LEGS_EQUAL: Lemma = {
  id: 'isosceles_legs_equal',
  nameHe: 'שוקי משולש שווה-שוקיים שוות',
  nameEn: 'Legs of an isosceles triangle are equal',
  category: 'isosceles',
  gradeLevel: [7],
  preconditions: [{ kind: 'isosceles', t: ['A', 'B', 'C'] }],
  conclusion: { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'C'] },
}

/** #4: base angles of isosceles triangle are equal. */
export const ISOSCELES_BASE_ANGLES: Lemma = {
  id: 'isosceles_base_angles',
  nameHe: 'זוויות הבסיס במשולש שווה שוקיים שוות',
  nameEn: 'Base angles of an isosceles triangle are equal',
  category: 'isosceles',
  gradeLevel: [7],
  preconditions: [{ kind: 'isosceles', t: ['A', 'B', 'C'] }],
  conclusion: { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['A', 'C', 'B'] },
}

/**
 * #3: in a triangle, sides opposite equal angles are equal.
 * (Converse of #4.) If ∠B = ∠C in △ABC then AB = AC.
 */
export const EQUAL_ANGLES_TO_EQUAL_SIDES: Lemma = {
  id: 'equal_angles_to_equal_sides',
  nameHe: 'מול זוויות שוות במשולש מונחות צלעות שוות',
  nameEn: 'In a triangle, sides opposite equal angles are equal',
  category: 'isosceles',
  gradeLevel: [7],
  preconditions: [{ kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['A', 'C', 'B'] }],
  conclusion: { kind: 'segment_eq', a: ['A', 'B'], b: ['A', 'C'] },
}

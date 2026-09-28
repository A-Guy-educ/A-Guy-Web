/**
 * Similarity criteria (list.pdf #95-#97) and one CPCTC-analog.
 * Ratios/proportions aren't modelled yet — we track the correspondence but
 * not the ratio itself. Enough to validate "prove △ABC ~ △DEF" style steps.
 */
import type { Lemma } from '../types.js'

/** #96: AA (two pairs of equal angles) ⇒ similar. */
export const SIMILARITY_AA: Lemma = {
  id: 'similarity_aa',
  nameHe: 'משפט דמיון ז.ז',
  nameEn: 'Similarity: AA (two equal angles)',
  category: 'similarity',
  gradeLevel: [8, 9],
  preconditions: [
    { kind: 'angle_eq', a: ['B', 'A', 'C'], b: ['E', 'D', 'F'] },
    { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
  ],
  conclusion: { kind: 'triangle_similar', t1: ['A', 'B', 'C'], t2: ['D', 'E', 'F'] },
}

/** Corresponding angles of similar triangles are equal. */
export const SIMILAR_CORRESPONDING_ANGLES: Lemma = {
  id: 'similar_corresponding_angles',
  nameHe: 'זוויות מתאימות במשולשים דומים שוות',
  nameEn: 'Corresponding angles of similar triangles are equal',
  category: 'similarity',
  gradeLevel: [8, 9],
  preconditions: [{ kind: 'triangle_similar', t1: ['A', 'B', 'C'], t2: ['D', 'E', 'F'] }],
  conclusion: { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
}

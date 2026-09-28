/**
 * Triangle congruence criteria (list.pdf #17-20) and CPCTC — corresponding
 * parts of congruent triangles are equal.
 *
 * We use vertex-correspondence sensitively: △ABC ≅ △DEF means A↔D, B↔E, C↔F.
 *
 * Design note: SAS/ASA/SSS do NOT require `triangle_exists` preconditions.
 * The segment/angle preconditions already reference all six vertices, so
 * the "the triangles must exist" gatekeeping was pedantic and forced
 * students to declare "△ABC exists" as an extra given. Real-world proofs
 * don't include that line.
 */
import type { Lemma } from '../types.js'

/** SAS — צ.ז.צ. */
export const SAS: Lemma = {
  id: 'congruence_sas',
  nameHe: 'משפט חפיפה צ.ז.צ',
  nameEn: 'Congruence: SAS (side-angle-side)',
  category: 'congruence',
  gradeLevel: [7, 8],
  preconditions: [
    { kind: 'segment_eq', a: ['A', 'B'], b: ['D', 'E'] },
    { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
    { kind: 'segment_eq', a: ['B', 'C'], b: ['E', 'F'] },
  ],
  conclusion: { kind: 'triangle_congruent', t1: ['A', 'B', 'C'], t2: ['D', 'E', 'F'] },
}

/** ASA — ז.צ.ז. */
export const ASA: Lemma = {
  id: 'congruence_asa',
  nameHe: 'משפט חפיפה ז.צ.ז',
  nameEn: 'Congruence: ASA (angle-side-angle)',
  category: 'congruence',
  gradeLevel: [7, 8],
  preconditions: [
    { kind: 'angle_eq', a: ['C', 'A', 'B'], b: ['F', 'D', 'E'] },
    { kind: 'segment_eq', a: ['A', 'B'], b: ['D', 'E'] },
    { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
  ],
  conclusion: { kind: 'triangle_congruent', t1: ['A', 'B', 'C'], t2: ['D', 'E', 'F'] },
}

/** SSS — צ.צ.צ. */
export const SSS: Lemma = {
  id: 'congruence_sss',
  nameHe: 'משפט חפיפה צ.צ.צ',
  nameEn: 'Congruence: SSS (side-side-side)',
  category: 'congruence',
  gradeLevel: [7, 8],
  preconditions: [
    { kind: 'segment_eq', a: ['A', 'B'], b: ['D', 'E'] },
    { kind: 'segment_eq', a: ['B', 'C'], b: ['E', 'F'] },
    { kind: 'segment_eq', a: ['A', 'C'], b: ['D', 'F'] },
  ],
  conclusion: { kind: 'triangle_congruent', t1: ['A', 'B', 'C'], t2: ['D', 'E', 'F'] },
}

/**
 * SsA — two sides and the angle opposite the greater side (list.pdf #20).
 * We can't check "greater" symbolically, so we require the student to declare
 * it via a `right_triangle`-like flag or accept it as an educated risk in v1.
 * For now we accept SSA outright with a caveat guard.
 * NOTE: excluded from the default catalogue until we add ordering facts.
 */

/** Corresponding sides of congruent triangles are equal. */
export const CPCTC_SIDE: Lemma = {
  id: 'cpctc_side',
  nameHe: 'צלעות מתאימות במשולשים חופפים שוות',
  nameEn: 'Corresponding sides of congruent triangles are equal',
  category: 'congruence',
  gradeLevel: [7, 8],
  preconditions: [{ kind: 'triangle_congruent', t1: ['A', 'B', 'C'], t2: ['D', 'E', 'F'] }],
  conclusion: { kind: 'segment_eq', a: ['A', 'B'], b: ['D', 'E'] },
}

/** Corresponding angles of congruent triangles are equal. */
export const CPCTC_ANGLE: Lemma = {
  id: 'cpctc_angle',
  nameHe: 'זוויות מתאימות במשולשים חופפים שוות',
  nameEn: 'Corresponding angles of congruent triangles are equal',
  category: 'congruence',
  gradeLevel: [7, 8],
  preconditions: [{ kind: 'triangle_congruent', t1: ['A', 'B', 'C'], t2: ['D', 'E', 'F'] }],
  conclusion: { kind: 'angle_eq', a: ['A', 'B', 'C'], b: ['D', 'E', 'F'] },
}

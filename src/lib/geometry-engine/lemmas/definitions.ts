/**
 * Definition-unpacking lemmas that make the intent of a shape declaration
 * concrete for the matcher. These are usually applied silently by the
 * validator, but they can also be selected as explicit steps.
 */
import type { Lemma } from '../types.js'

/** Midpoint definition: if M is midpoint of AB then AM = MB. */
export const MIDPOINT_DIVIDES_EQUAL: Lemma = {
  id: 'midpoint_divides_equal',
  nameHe: 'אמצע קטע מחלק אותו לשני חלקים שווים',
  nameEn: 'The midpoint of a segment divides it into two equal parts',
  category: 'definitions',
  gradeLevel: [7],
  preconditions: [{ kind: 'midpoint', m: 'M', a: 'A', b: 'B' }],
  conclusion: { kind: 'segment_eq', a: ['A', 'M'], b: ['M', 'B'] },
}

/** Midpoint ⇒ the three points are collinear. */
export const MIDPOINT_COLLINEAR: Lemma = {
  id: 'midpoint_collinear',
  nameHe: 'אמצע קטע נמצא על הקטע',
  nameEn: 'The midpoint lies on the segment',
  category: 'definitions',
  gradeLevel: [7],
  preconditions: [{ kind: 'midpoint', m: 'M', a: 'A', b: 'B' }],
  conclusion: { kind: 'between', a: 'A', m: 'M', b: 'B' },
}

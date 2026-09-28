/**
 * Seed proof problems used by the /tools/geometry-proof POC. All three are
 * taken from real Israeli grade 9-10 textbook exercises.
 *
 * Each problem carries a rendering spec (via the shared `GeometrySpecV1`
 * contract so we can reuse `GeometryRenderer`), plus the extra givens the
 * spec can't express, plus the goal. `extraGivens` also includes
 * "diagram-obvious" facts — configuration equalities a student would read
 * off the picture without hesitation (e.g. "AD is the angle bisector
 * because in an isosceles triangle the altitude from the apex bisects the
 * apex angle") — so the student can focus on the interesting reasoning
 * (congruence + CPCTC + angle chase) rather than re-deriving axioms.
 *
 * Real content will eventually come from Payload; this file exists so the
 * POC has three walkable proofs to demo.
 */
import type { GeometrySpecV1 } from '@/infra/contracts/graphics/geometry.v1'
import type { Fact } from './types'

export interface GeometryProofProblem {
  id: string
  titleHe: string
  statementHe: string
  spec: GeometrySpecV1
  extraGivens: readonly Fact[]
  goal: Fact
}

export const PROBLEMS: readonly GeometryProofProblem[] = [
  {
    id: 'isosceles-EF-through-altitude',
    titleHe: 'שווה־שוקיים: EF חוצה את התיכון',
    statementHe: 'המשולש ABC הוא שווה־שוקיים (AB = AC). נתון: AD ⊥ BC, AE = AF. הוכיחו כי GE = GF.',
    spec: {
      kind: 'euclidean',
      canvas: { width: 500, height: 400 },
      elements: {
        points: [
          { name: 'A', x: 250, y: 60, position: 't' },
          { name: 'B', x: 100, y: 340, position: 'bl' },
          { name: 'C', x: 400, y: 340, position: 'br' },
          { name: 'D', x: 250, y: 340, position: 'b' },
          { name: 'E', x: 190, y: 172, position: 'l' },
          { name: 'F', x: 310, y: 172, position: 'r' },
          { name: 'G', x: 250, y: 172, position: 'tl' },
        ],
        lines: [
          { from: 'A', to: 'B', style: 'solid' },
          { from: 'A', to: 'C', style: 'solid' },
          { from: 'B', to: 'C', style: 'solid' },
          { from: 'A', to: 'D', style: 'solid' },
          { from: 'E', to: 'F', style: 'solid' },
        ],
        circles: [],
        angles: [],
        triangles: [{ points: ['A', 'B', 'C'] }],
        equalSegments: [
          [
            { from: 'A', to: 'E' },
            { from: 'A', to: 'F' },
          ],
        ],
      },
    },
    extraGivens: [
      { kind: 'isosceles', t: ['A', 'B', 'C'] },
      { kind: 'perpendicular', a: ['A', 'D'], b: ['B', 'C'] },
      { kind: 'between', a: 'B', m: 'D', b: 'C' },
      { kind: 'between', a: 'A', m: 'E', b: 'B' },
      { kind: 'between', a: 'A', m: 'F', b: 'C' },
      { kind: 'between', a: 'A', m: 'G', b: 'D' },
      { kind: 'between', a: 'E', m: 'G', b: 'F' },
      { kind: 'angle_eq', a: ['E', 'A', 'G'], b: ['F', 'A', 'G'] },
    ],
    goal: { kind: 'segment_eq', a: ['G', 'E'], b: ['G', 'F'] },
  },
  {
    id: 'parallelogram-diagonal-extension',
    titleHe: 'מקבילית: המשך אלכסון + זוויות שוות',
    statementHe:
      'המרובע ABCD הוא מקבילית. הנקודות E ו־F נמצאות על המשך האלכסון AC (E מעבר ל־A ו־F מעבר ל־C). נתון: AE = CF. הוכיחו כי ∠EDC = ∠FBA.',
    spec: {
      kind: 'euclidean',
      canvas: { width: 620, height: 420 },
      elements: {
        points: [
          { name: 'E', x: 60, y: 68, position: 'tl' },
          { name: 'A', x: 200, y: 120, position: 't' },
          { name: 'B', x: 430, y: 120, position: 'tr' },
          { name: 'D', x: 120, y: 300, position: 'bl' },
          { name: 'C', x: 350, y: 300, position: 'b' },
          { name: 'F', x: 490, y: 352, position: 'br' },
        ],
        lines: [
          { from: 'A', to: 'B', style: 'solid' },
          { from: 'B', to: 'C', style: 'solid' },
          { from: 'C', to: 'D', style: 'solid' },
          { from: 'D', to: 'A', style: 'solid' },
          { from: 'E', to: 'F', style: 'solid' },
          { from: 'D', to: 'E', style: 'solid' },
          { from: 'B', to: 'F', style: 'solid' },
        ],
        circles: [],
        angles: [],
        equalSegments: [
          [
            { from: 'A', to: 'E' },
            { from: 'C', to: 'F' },
          ],
        ],
      },
    },
    extraGivens: [
      { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
      { kind: 'between', a: 'E', m: 'A', b: 'C' },
      { kind: 'between', a: 'A', m: 'C', b: 'F' },
      { kind: 'parallel', a: ['A', 'D'], b: ['B', 'C'] },
      { kind: 'segment_eq', a: ['A', 'D'], b: ['B', 'C'] },
      { kind: 'angle_eq', a: ['A', 'D', 'C'], b: ['A', 'B', 'C'] },
    ],
    goal: { kind: 'angle_eq', a: ['E', 'D', 'C'], b: ['F', 'B', 'A'] },
  },
  {
    id: 'parallelogram-long-side-midpoint-bisector',
    titleHe: 'מקבילית עם צלע כפולה: AE חוצה את הזווית BAD',
    statementHe:
      'במקבילית ABCD הצלע AB ארוכה פי 2 מהצלע BC. הנקודה E נמצאת באמצע הצלע DC. הוכיחו כי AE חוצה את הזווית ∠BAD.',
    spec: {
      kind: 'euclidean',
      canvas: { width: 620, height: 380 },
      elements: {
        points: [
          { name: 'A', x: 100, y: 100, position: 'tl' },
          { name: 'B', x: 500, y: 100, position: 'tr' },
          { name: 'C', x: 560, y: 300, position: 'br' },
          { name: 'D', x: 160, y: 300, position: 'bl' },
          { name: 'E', x: 360, y: 300, position: 'b' },
        ],
        lines: [
          { from: 'A', to: 'B', style: 'solid' },
          { from: 'B', to: 'C', style: 'solid' },
          { from: 'C', to: 'D', style: 'solid' },
          { from: 'D', to: 'A', style: 'solid' },
          { from: 'A', to: 'E', style: 'solid' },
          { from: 'B', to: 'E', style: 'solid' },
        ],
        circles: [],
        angles: [],
      },
    },
    extraGivens: [
      { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
      { kind: 'midpoint', m: 'E', a: 'D', b: 'C' },
      { kind: 'between', a: 'D', m: 'E', b: 'C' },
      { kind: 'segment_eq', a: ['A', 'D'], b: ['D', 'E'] },
      { kind: 'isosceles', t: ['D', 'A', 'E'] },
      { kind: 'parallel', a: ['D', 'E'], b: ['A', 'B'] },
    ],
    goal: { kind: 'angle_eq', a: ['D', 'A', 'E'], b: ['B', 'A', 'E'] },
  },
]

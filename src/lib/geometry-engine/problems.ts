/**
 * Seed proof problems used by the /tools/geometry-proof POC.
 *
 * Each problem carries a rendering spec (via the shared `GeometrySpecV1`
 * contract so we can reuse `GeometryRenderer`), plus the extra givens the
 * spec can't express (parallels, midpoints, betweenness, sub-triangles
 * implied by the drawing), plus the goal.
 *
 * Real content will eventually come from Payload; this file exists so the
 * POC has something to load.
 */
import type { GeometrySpecV1 } from '@/infra/contracts/graphics/geometry.v1'
import type { Fact } from './types'

export interface GeometryProofProblem {
  id: string
  titleHe: string
  statementHe: string
  spec: GeometrySpecV1
  /**
   * Facts the rendering spec can't carry: sub-triangles implied by drawn
   * lines, parallel/perpendicular declarations beyond right-angle markers,
   * midpoints, and betweenness relations.
   */
  extraGivens: readonly Fact[]
  goal: Fact
}

export const PROBLEMS: readonly GeometryProofProblem[] = [
  {
    id: 'isosceles-median-perp',
    titleHe: 'משולש שווה־שוקיים: תיכון מאונך לבסיס',
    statementHe: 'נתון משולש שווה־שוקיים ABC (AB = AC) ו־D אמצע BC. הוכיחו כי AD ⊥ BC.',
    spec: {
      kind: 'euclidean',
      canvas: { width: 480, height: 400 },
      elements: {
        points: [
          { name: 'A', x: 240, y: 60, position: 't' },
          { name: 'B', x: 140, y: 320, position: 'bl' },
          { name: 'C', x: 340, y: 320, position: 'br' },
          { name: 'D', x: 240, y: 320, position: 'b' },
        ],
        lines: [
          { from: 'A', to: 'B', style: 'solid' },
          { from: 'A', to: 'C', style: 'solid' },
          { from: 'A', to: 'D', style: 'solid' },
          { from: 'B', to: 'C', style: 'solid' },
        ],
        circles: [],
        angles: [],
        triangles: [{ points: ['A', 'B', 'C'] }],
        equalSegments: [
          [
            { from: 'A', to: 'B' },
            { from: 'A', to: 'C' },
          ],
          [
            { from: 'B', to: 'D' },
            { from: 'D', to: 'C' },
          ],
        ],
      },
    },
    extraGivens: [
      { kind: 'triangle_exists', t: ['A', 'B', 'D'] },
      { kind: 'triangle_exists', t: ['A', 'C', 'D'] },
      { kind: 'between', a: 'B', m: 'D', b: 'C' },
    ],
    goal: { kind: 'perpendicular', a: ['A', 'D'], b: ['B', 'C'] },
  },
  {
    id: 'parallelogram-diagonal-congruent',
    titleHe: 'אלכסון במקבילית: משולשים חופפים',
    statementHe: 'נתונה מקבילית ABCD. הוכיחו כי △ABC ≅ △CDA.',
    spec: {
      kind: 'euclidean',
      canvas: { width: 520, height: 400 },
      elements: {
        points: [
          { name: 'A', x: 120, y: 100, position: 'tl' },
          { name: 'B', x: 380, y: 100, position: 'tr' },
          { name: 'C', x: 460, y: 300, position: 'br' },
          { name: 'D', x: 200, y: 300, position: 'bl' },
        ],
        lines: [
          { from: 'A', to: 'B', style: 'solid' },
          { from: 'B', to: 'C', style: 'solid' },
          { from: 'C', to: 'D', style: 'solid' },
          { from: 'D', to: 'A', style: 'solid' },
          { from: 'A', to: 'C', style: 'solid' },
        ],
        circles: [],
        angles: [],
      },
    },
    extraGivens: [
      { kind: 'parallelogram', q: ['A', 'B', 'C', 'D'] },
      { kind: 'triangle_exists', t: ['A', 'B', 'C'] },
      { kind: 'triangle_exists', t: ['C', 'D', 'A'] },
    ],
    goal: {
      kind: 'triangle_congruent',
      t1: ['A', 'B', 'C'],
      t2: ['C', 'D', 'A'],
    },
  },
]

import { describe, expect, it } from 'vitest'
import type { GeometrySpecV1 } from '@/infra/contracts/graphics/geometry.v1'
import { specToFacts } from '@/lib/geometry-engine/spec-to-facts'
import type { Fact } from '@/lib/geometry-engine/types'

function makeSpec(elements: GeometrySpecV1['elements']): GeometrySpecV1 {
  return {
    kind: 'euclidean',
    canvas: { width: 400, height: 400 },
    elements,
  }
}

describe('specToFacts', () => {
  it('extracts point names and coords in spec order', () => {
    const spec = makeSpec({
      points: [
        { name: 'A', x: 0, y: 0 },
        { name: 'B', x: 10, y: 0 },
      ],
      lines: [],
      circles: [],
      angles: [],
    })
    const result = specToFacts(spec)
    expect(result.pointNames).toEqual(['A', 'B'])
    expect(result.placedPoints).toEqual([
      { name: 'A', x: 0, y: 0 },
      { name: 'B', x: 10, y: 0 },
    ])
  })

  it('emits triangle_exists for each declared triangle', () => {
    const spec = makeSpec({
      points: [
        { name: 'A', x: 0, y: 0 },
        { name: 'B', x: 10, y: 0 },
        { name: 'C', x: 5, y: 10 },
      ],
      lines: [],
      circles: [],
      angles: [],
      triangles: [{ points: ['A', 'B', 'C'] }],
    })
    const result = specToFacts(spec)
    expect(result.facts).toContainEqual<Fact>({
      kind: 'triangle_exists',
      t: ['A', 'B', 'C'],
    })
  })

  it('emits pairwise segment_eq from an equalSegments group', () => {
    const spec = makeSpec({
      points: [
        { name: 'A', x: 0, y: 0 },
        { name: 'B', x: 10, y: 0 },
        { name: 'C', x: 5, y: 10 },
      ],
      lines: [],
      circles: [],
      angles: [],
      equalSegments: [
        [
          { from: 'A', to: 'B' },
          { from: 'A', to: 'C' },
        ],
      ],
    })
    const result = specToFacts(spec)
    expect(result.facts).toContainEqual<Fact>({
      kind: 'segment_eq',
      a: ['A', 'B'],
      b: ['A', 'C'],
    })
  })

  it('emits pairwise angle_eq via equalAngles indexes', () => {
    const spec = makeSpec({
      points: [
        { name: 'A', x: 0, y: 0 },
        { name: 'B', x: 10, y: 0 },
        { name: 'C', x: 5, y: 10 },
        { name: 'D', x: -5, y: 10 },
      ],
      lines: [],
      circles: [],
      angles: [
        { center: 'A', ray1: 'B', ray2: 'C' },
        { center: 'A', ray1: 'C', ray2: 'D' },
      ],
      equalAngles: [[0, 1]],
    })
    const result = specToFacts(spec)
    expect(result.facts).toContainEqual<Fact>({
      kind: 'angle_eq',
      a: ['B', 'A', 'C'],
      b: ['C', 'A', 'D'],
    })
  })

  it('emits perpendicular + angle_measure=90 for right-angle square markers', () => {
    const spec = makeSpec({
      points: [
        { name: 'A', x: 0, y: 0 },
        { name: 'B', x: 10, y: 0 },
        { name: 'C', x: 0, y: 10 },
      ],
      lines: [],
      circles: [],
      angles: [{ center: 'A', ray1: 'B', ray2: 'C', style: 'square' }],
    })
    const result = specToFacts(spec)
    expect(result.facts).toContainEqual<Fact>({
      kind: 'angle_measure',
      angle: ['B', 'A', 'C'],
      degrees: 90,
    })
    expect(result.facts).toContainEqual<Fact>({
      kind: 'perpendicular',
      a: ['A', 'B'],
      b: ['A', 'C'],
    })
  })

  it('ignores non-square angle style', () => {
    const spec = makeSpec({
      points: [
        { name: 'A', x: 0, y: 0 },
        { name: 'B', x: 10, y: 0 },
        { name: 'C', x: 5, y: 10 },
      ],
      lines: [],
      circles: [],
      angles: [{ center: 'A', ray1: 'B', ray2: 'C', style: 'arc' }],
    })
    const result = specToFacts(spec)
    expect(result.facts.every((f) => f.kind !== 'perpendicular')).toBe(true)
  })
})

/**
 * Convert an A-Guy `GeometrySpecV1` (the shared rendering contract) into
 * the fact pool consumed by the proof engine.
 *
 * The spec is a rendering shape (points + lines + angles + …). Most of it
 * has no proof-relevant meaning: `lines[]` is just "draw a segment," style
 * is presentational, etc. The parts that DO carry semantic weight:
 *
 *   - `triangles[]`         →  `triangle_exists`
 *   - `rectangles[]`        →  `rectangle` (declared shape)
 *   - `equalSegments[][]`   →  pairwise `segment_eq`
 *   - `equalAngles[][]`     →  pairwise `angle_eq`  (via index → angle triple)
 *   - `angles[]` with       →  `perpendicular` + `angle_measure = 90`
 *     `style: 'square'`
 *
 * Everything the engine needs beyond the spec — parallels, midpoints,
 * betweenness on explicit lines, and of course the *goal* — comes from
 * `extraGivens` and `goal` fields on the proof problem, alongside the spec.
 *
 * The point coordinates are also returned so callers can feed them to
 * `computeDerivedGeometryFacts` for coordinate-based `ray_between`.
 */
import type { GeometrySpecV1 } from '@/infra/contracts/graphics/geometry.v1'
import type { PlacedPoint } from './sandbox'
import type { Angle, Fact, PointName, Quad, Seg, Triangle } from './types'

export interface SpecToFactsResult {
  /** Point names in the order they appear in the spec. */
  pointNames: readonly PointName[]
  /** Points with x/y for coordinate-based derivation (ray_between, etc). */
  placedPoints: readonly PlacedPoint[]
  /** Facts derived purely from the spec's declarative elements. */
  facts: readonly Fact[]
}

export function specToFacts(spec: GeometrySpecV1): SpecToFactsResult {
  const { elements } = spec
  const pointNames = elements.points.map((p) => p.name)
  const placedPoints: PlacedPoint[] = elements.points.map((p) => ({
    name: p.name,
    x: p.x,
    y: p.y,
  }))

  const facts: Fact[] = []

  for (const tri of elements.triangles ?? []) {
    if (tri.points.length !== 3) continue
    facts.push({
      kind: 'triangle_exists',
      t: tri.points as unknown as Triangle,
    })
  }

  for (const rect of elements.rectangles ?? []) {
    if (rect.points.length !== 4) continue
    facts.push({
      kind: 'rectangle',
      q: rect.points as unknown as Quad,
    })
  }

  for (const group of elements.equalSegments ?? []) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!
        const b = group[j]!
        facts.push({
          kind: 'segment_eq',
          a: [a.from, a.to] as Seg,
          b: [b.from, b.to] as Seg,
        })
      }
    }
  }

  for (const indexGroup of elements.equalAngles ?? []) {
    const anglesInGroup: Angle[] = []
    for (const idx of indexGroup) {
      const spec = elements.angles[idx]
      if (!spec) continue
      anglesInGroup.push([spec.ray1, spec.center, spec.ray2] as Angle)
    }
    for (let i = 0; i < anglesInGroup.length; i++) {
      for (let j = i + 1; j < anglesInGroup.length; j++) {
        facts.push({
          kind: 'angle_eq',
          a: anglesInGroup[i]!,
          b: anglesInGroup[j]!,
        })
      }
    }
  }

  for (const angle of elements.angles) {
    if (angle.style !== 'square') continue
    const triple: Angle = [angle.ray1, angle.center, angle.ray2]
    facts.push({ kind: 'angle_measure', angle: triple, degrees: 90 })
    facts.push({
      kind: 'perpendicular',
      a: [angle.center, angle.ray1] as Seg,
      b: [angle.center, angle.ray2] as Seg,
    })
  }

  return { pointNames, placedPoints, facts }
}

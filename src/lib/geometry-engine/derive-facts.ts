/**
 * Auto-derive structural geometry facts from the raw point coordinates.
 *
 * The engine is deliberately coordinate-free — every fact is symbolic —
 * so relationships that are "visually obvious" from the diagram (like
 * "ray VM sits inside angle ∠AVB at vertex V") never enter the fact pool
 * unless someone declares them. That's fine for `between`, which the
 * point-on-line snap emits automatically. `ray_between` is trickier: a
 * student won't manually type "ray CF inside ∠ACD" before an
 * angle-addition step. This helper reads the point coordinates and
 * emits every `ray_between` that geometrically holds.
 *
 * Complexity: O(N⁴). For a typical proof with ≤ 8 points that's ≤ ~1500
 * triples to check, each a couple of multiplications. Well under 1ms.
 */
import type { Fact } from './types'
import type { PlacedPoint } from './sandbox'

export function computeDerivedGeometryFacts(points: readonly PlacedPoint[]): Fact[] {
  const facts: Fact[] = []
  const n = points.length
  for (let vi = 0; vi < n; vi++) {
    const V = points[vi]!
    // Ray endpoints a and b are interchangeable (∠AVB == ∠BVA) — only
    // emit ai < bi so we don't produce both orderings.
    for (let ai = 0; ai < n; ai++) {
      if (ai === vi) continue
      const A = points[ai]!
      for (let bi = ai + 1; bi < n; bi++) {
        if (bi === vi) continue
        const B = points[bi]!
        for (let mi = 0; mi < n; mi++) {
          if (mi === vi || mi === ai || mi === bi) continue
          const M = points[mi]!
          if (rayInsideAngle(V, A, M, B)) {
            facts.push({
              kind: 'ray_between',
              vertex: V.name,
              a: A.name,
              m: M.name,
              b: B.name,
            })
          }
        }
      }
    }
  }
  return facts
}

/**
 * Is ray VM strictly inside the "smaller-angle" wedge ∠AVB?
 *
 * 2D cross-product test:
 *   VA × VM has the same sign as VA × VB   (M on same side of ray VA as B)
 *   VB × VM has the opposite sign of VB × VA   (M on same side of ray VB as A)
 * The second condition is equivalent to VA × VB and VB × VM having opposite signs.
 */
function rayInsideAngle(V: PlacedPoint, A: PlacedPoint, M: PlacedPoint, B: PlacedPoint): boolean {
  const vax = A.x - V.x
  const vay = A.y - V.y
  const vmx = M.x - V.x
  const vmy = M.y - V.y
  const vbx = B.x - V.x
  const vby = B.y - V.y

  const crossAB = vax * vby - vay * vbx
  const crossAM = vax * vmy - vay * vmx
  const crossBM = vbx * vmy - vby * vmx

  // Degenerate cases (colinear or zero-length rays) — don't emit.
  if (crossAB === 0 || crossAM === 0 || crossBM === 0) return false

  return crossAB * crossAM > 0 && crossAB * crossBM < 0
}

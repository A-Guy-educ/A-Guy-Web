/**
 * Union-find over equality facts. Yields "which set does this segment
 * (or angle) belong to?" so the diagram can render tick marks / arc
 * marks in the standard geometry convention (one tick for the first
 * equality class, two ticks for the second, etc.).
 */
import type { Fact } from './types'

// ------------- Segment classes -------------

const segKey = (s: readonly [string, string]) =>
  s[0] <= s[1] ? `${s[0]},${s[1]}` : `${s[1]},${s[0]}`

export interface SegmentClasses {
  /** Canonical segment key -> class index (0-based). Only members of a
   *  class with ≥ 2 distinct segments are included. */
  classOf: Map<string, number>
}

export function segmentEqualityClasses(facts: readonly Fact[]): SegmentClasses {
  const parent = new Map<string, string>()
  const rank = new Map<string, number>()
  function find(x: string): string {
    if (!parent.has(x)) {
      parent.set(x, x)
      rank.set(x, 0)
    }
    let root = x
    while (parent.get(root)! !== root) root = parent.get(root)!
    // Path compression
    let cur = x
    while (parent.get(cur)! !== root) {
      const next = parent.get(cur)!
      parent.set(cur, root)
      cur = next
    }
    return root
  }
  function union(a: string, b: string) {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return
    const ranka = rank.get(ra) ?? 0
    const rankb = rank.get(rb) ?? 0
    if (ranka < rankb) parent.set(ra, rb)
    else if (ranka > rankb) parent.set(rb, ra)
    else {
      parent.set(rb, ra)
      rank.set(ra, ranka + 1)
    }
  }

  for (const f of facts) {
    if (f.kind === 'segment_eq') {
      union(segKey(f.a), segKey(f.b))
    }
  }

  // Count members per root; only roots with ≥ 2 members are "classes".
  const memberCount = new Map<string, number>()
  for (const k of parent.keys()) {
    const r = find(k)
    memberCount.set(r, (memberCount.get(r) ?? 0) + 1)
  }
  const rootToClassIdx = new Map<string, number>()
  const classOf = new Map<string, number>()
  // Walk facts again in order to assign class indices deterministically
  // by first-appearance in the fact list — that way the tick counts
  // (single-tick, double-tick, ...) don't shuffle between renders.
  let nextIdx = 0
  for (const f of facts) {
    if (f.kind !== 'segment_eq') continue
    for (const s of [f.a, f.b]) {
      const k = segKey(s)
      const r = find(k)
      if ((memberCount.get(r) ?? 0) < 2) continue
      if (!rootToClassIdx.has(r)) rootToClassIdx.set(r, nextIdx++)
      const idx = rootToClassIdx.get(r)!
      if (!classOf.has(k)) classOf.set(k, idx)
    }
  }
  return { classOf }
}

// ------------- Angle classes -------------

/** Canonical angle key — outer rays are interchangeable, vertex is fixed. */
const angKey = (a: readonly [string, string, string]) => {
  const [x, y, z] = a
  const [lo, hi] = x <= z ? [x, z] : [z, x]
  return `${lo},${y},${hi}`
}

export interface ClassifiedAngle {
  vertex: string
  rayA: string
  rayB: string
  classIdx: number
}

export function angleEqualityClasses(facts: readonly Fact[]): ClassifiedAngle[] {
  const parent = new Map<string, string>()
  const rank = new Map<string, number>()
  function find(x: string): string {
    if (!parent.has(x)) {
      parent.set(x, x)
      rank.set(x, 0)
    }
    let root = x
    while (parent.get(root)! !== root) root = parent.get(root)!
    let cur = x
    while (parent.get(cur)! !== root) {
      const next = parent.get(cur)!
      parent.set(cur, root)
      cur = next
    }
    return root
  }
  function union(a: string, b: string) {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return
    const ranka = rank.get(ra) ?? 0
    const rankb = rank.get(rb) ?? 0
    if (ranka < rankb) parent.set(ra, rb)
    else if (ranka > rankb) parent.set(rb, ra)
    else {
      parent.set(rb, ra)
      rank.set(ra, ranka + 1)
    }
  }

  for (const f of facts) {
    if (f.kind === 'angle_eq') {
      union(angKey(f.a), angKey(f.b))
    }
  }

  // Emit each unique angle with its class index (only classes ≥ 2 members).
  const memberCount = new Map<string, number>()
  for (const k of parent.keys()) {
    const r = find(k)
    memberCount.set(r, (memberCount.get(r) ?? 0) + 1)
  }
  const rootToClassIdx = new Map<string, number>()
  const seen = new Set<string>()
  const out: ClassifiedAngle[] = []
  let nextIdx = 0
  for (const f of facts) {
    if (f.kind !== 'angle_eq') continue
    for (const a of [f.a, f.b]) {
      const k = angKey(a)
      if (seen.has(k)) continue
      const r = find(k)
      if ((memberCount.get(r) ?? 0) < 2) continue
      seen.add(k)
      if (!rootToClassIdx.has(r)) rootToClassIdx.set(r, nextIdx++)
      // a[1] is always the vertex; a[0] and a[2] are outer rays.
      out.push({
        vertex: a[1],
        rayA: a[0],
        rayB: a[2],
        classIdx: rootToClassIdx.get(r)!,
      })
    }
  }
  return out
}

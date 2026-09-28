/**
 * Canonical forms and equivalence-form enumeration for facts.
 *
 * Two facts are semantically identical if they represent the same geometric
 * claim under symmetry (e.g., `AB = CD` ≡ `BA = DC` ≡ `CD = AB`). We handle
 * this two ways:
 *
 *  - `canonicalize(fact)` returns a unique canonical form for equality
 *    comparison and deduplication in the fact store.
 *  - `enumerateForms(fact)` yields every equivalent presentation of a fact,
 *    which the matcher iterates over when unifying against a pattern (so the
 *    pattern only has to line up with *one* presentation).
 */

import type { Angle, Fact, PointName, Quad, Seg, Triangle } from './types.js'

// -------------------- Segment --------------------

export function canonSeg(s: Seg): Seg {
  return s[0] <= s[1] ? [s[0], s[1]] : [s[1], s[0]]
}

/** Both orderings of a segment. */
export function segForms(s: Seg): Seg[] {
  return [
    [s[0], s[1]],
    [s[1], s[0]],
  ]
}

// -------------------- Angle --------------------
// Angle rays around a vertex are interchangeable: ∠ABC == ∠CBA.

export function canonAngle(a: Angle): Angle {
  return a[0] <= a[2] ? [a[0], a[1], a[2]] : [a[2], a[1], a[0]]
}

export function angleForms(a: Angle): Angle[] {
  return [
    [a[0], a[1], a[2]],
    [a[2], a[1], a[0]],
  ]
}

// -------------------- Triangle (existence-only) --------------------
// For `triangle_exists`, vertex order doesn't matter (unordered set of 3).

export function canonTriangleUnordered(t: Triangle): Triangle {
  const sorted = [t[0], t[1], t[2]].sort() as unknown as Triangle
  return sorted
}

/** All 6 vertex orderings. */
export function triangleForms(t: Triangle): Triangle[] {
  const [a, b, c] = t
  return [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ]
}

// -------------------- Triangle correspondence pair --------------------
// (t1, t2) with positional correspondence. Symmetries:
//   - cyclic rotation of both together (3)
//   - reflection of both together (2)  → 6 alignments
//   - swap of t1 <-> t2                → x2 = 12 total presentations

export function trianglePairForms(t1: Triangle, t2: Triangle): [Triangle, Triangle][] {
  const rotations: [Triangle, Triangle][] = [
    [t1, t2],
    [
      [t1[1], t1[2], t1[0]],
      [t2[1], t2[2], t2[0]],
    ],
    [
      [t1[2], t1[0], t1[1]],
      [t2[2], t2[0], t2[1]],
    ],
  ]
  const withReflection: [Triangle, Triangle][] = rotations.flatMap(([a, b]) => [
    [a, b],
    [
      [a[0], a[2], a[1]],
      [b[0], b[2], b[1]],
    ],
  ])
  const withSwap: [Triangle, Triangle][] = withReflection.flatMap(([a, b]) => [
    [a, b],
    [b, a],
  ])
  return withSwap
}

function pairKey(p: [Triangle, Triangle]): string {
  return p[0].join(',') + '|' + p[1].join(',')
}

export function canonTrianglePair(t1: Triangle, t2: Triangle): [Triangle, Triangle] {
  const forms = trianglePairForms(t1, t2)
  let best = forms[0]!
  let bestKey = pairKey(best)
  for (let i = 1; i < forms.length; i++) {
    const k = pairKey(forms[i]!)
    if (k < bestKey) {
      best = forms[i]!
      bestKey = k
    }
  }
  return best
}

// -------------------- Quadrilateral --------------------
// For a parallelogram/rectangle/rhombus/square, vertices ABCD are named
// walking around the shape. Equivalences: cyclic rotation (4) + reversal (2).

export function quadForms(q: Quad): Quad[] {
  const [a, b, c, d] = q
  return [
    [a, b, c, d],
    [b, c, d, a],
    [c, d, a, b],
    [d, a, b, c],
    [a, d, c, b], // reversal
    [d, c, b, a],
    [c, b, a, d],
    [b, a, d, c],
  ]
}

export function canonQuad(q: Quad): Quad {
  const forms = quadForms(q)
  let best = forms[0]!
  let bestKey = best.join(',')
  for (let i = 1; i < forms.length; i++) {
    const k = forms[i]!.join(',')
    if (k < bestKey) {
      best = forms[i]!
      bestKey = k
    }
  }
  return best
}

/**
 * Trapezoid: only ONE pair of parallel sides (q[0]q[1] ∥ q[2]q[3]). We may
 * flip which base comes first, and reverse each base's endpoint order. So
 * the true symmetry group is smaller than for a parallelogram.
 */
export function quadTrapezoidForms(q: Quad): Quad[] {
  const [a, b, c, d] = q
  return [
    [a, b, c, d],
    [b, a, d, c], // reverse both bases
    [c, d, a, b], // swap which base is "first"
    [d, c, b, a],
  ]
}

// -------------------- Fact canonicalisation --------------------

export function canonicalize(f: Fact): Fact {
  switch (f.kind) {
    case 'segment_eq': {
      const a = canonSeg(f.a)
      const b = canonSeg(f.b)
      const [x, y] = a.join(',') <= b.join(',') ? [a, b] : [b, a]
      return { kind: 'segment_eq', a: x, b: y }
    }
    case 'angle_eq': {
      const a = canonAngle(f.a)
      const b = canonAngle(f.b)
      const [x, y] = a.join(',') <= b.join(',') ? [a, b] : [b, a]
      return { kind: 'angle_eq', a: x, b: y }
    }
    case 'angle_measure':
      return { kind: 'angle_measure', angle: canonAngle(f.angle), degrees: f.degrees }
    case 'angle_sum': {
      const angs = f.angles
        .map(canonAngle)
        .slice()
        .sort((a, b) => a.join(',').localeCompare(b.join(',')))
      return { kind: 'angle_sum', angles: angs, degrees: f.degrees }
    }
    case 'triangle_congruent': {
      const [t1, t2] = canonTrianglePair(f.t1, f.t2)
      return { kind: 'triangle_congruent', t1, t2 }
    }
    case 'triangle_similar': {
      const [t1, t2] = canonTrianglePair(f.t1, f.t2)
      return { kind: 'triangle_similar', t1, t2 }
    }
    case 'parallel': {
      const a = canonSeg(f.a)
      const b = canonSeg(f.b)
      const [x, y] = a.join(',') <= b.join(',') ? [a, b] : [b, a]
      return { kind: 'parallel', a: x, b: y }
    }
    case 'perpendicular': {
      const a = canonSeg(f.a)
      const b = canonSeg(f.b)
      const [x, y] = a.join(',') <= b.join(',') ? [a, b] : [b, a]
      return { kind: 'perpendicular', a: x, b: y }
    }
    case 'segment_exists':
      return { kind: 'segment_exists', s: canonSeg(f.s) }
    case 'triangle_exists':
      return { kind: 'triangle_exists', t: canonTriangleUnordered(f.t) }
    case 'collinear': {
      const pts = [...f.points].sort()
      return { kind: 'collinear', points: pts }
    }
    case 'between': {
      // "between" is symmetric in a↔b (m is between them either way).
      const [a, b] = f.a <= f.b ? [f.a, f.b] : [f.b, f.a]
      return { kind: 'between', a, m: f.m, b }
    }
    case 'midpoint': {
      const [a, b] = f.a <= f.b ? [f.a, f.b] : [f.b, f.a]
      return { kind: 'midpoint', m: f.m, a, b }
    }
    case 'ray_between': {
      // ∠AVB == ∠BVA, so `a` and `b` are interchangeable — sort them.
      const [a, b] = f.a <= f.b ? [f.a, f.b] : [f.b, f.a]
      return { kind: 'ray_between', vertex: f.vertex, a, m: f.m, b }
    }
    case 'isosceles':
      // Apex is t[0]; the two base vertices (t[1], t[2]) are interchangeable.
      return {
        kind: 'isosceles',
        t: f.t[1] <= f.t[2] ? f.t : [f.t[0], f.t[2], f.t[1]],
      }
    case 'parallelogram':
      return { kind: 'parallelogram', q: canonQuad(f.q) }
    case 'rectangle':
      return { kind: 'rectangle', q: canonQuad(f.q) }
    case 'rhombus':
      return { kind: 'rhombus', q: canonQuad(f.q) }
    case 'square':
      return { kind: 'square', q: canonQuad(f.q) }
    case 'trapezoid': {
      const forms = quadTrapezoidForms(f.q)
      let best = forms[0]!
      let key = best.join(',')
      for (let i = 1; i < forms.length; i++) {
        const k = forms[i]!.join(',')
        if (k < key) {
          best = forms[i]!
          key = k
        }
      }
      return { kind: 'trapezoid', q: best }
    }
    case 'trapezoid_isosceles': {
      const forms = quadTrapezoidForms(f.q)
      let best = forms[0]!
      let key = best.join(',')
      for (let i = 1; i < forms.length; i++) {
        const k = forms[i]!.join(',')
        if (k < key) {
          best = forms[i]!
          key = k
        }
      }
      return { kind: 'trapezoid_isosceles', q: best }
    }
  }
}

export function factKey(f: Fact): string {
  const c = canonicalize(f)
  return JSON.stringify(c)
}

// -------------------- Enumerate equivalent presentations --------------------
// Used by the matcher: yield every valid presentation of a fact so we can try
// to unify a pattern against each in turn.

export function enumerateForms(f: Fact): Fact[] {
  switch (f.kind) {
    case 'segment_eq': {
      const out: Fact[] = []
      for (const a of segForms(f.a)) {
        for (const b of segForms(f.b)) {
          out.push({ kind: 'segment_eq', a, b })
          out.push({ kind: 'segment_eq', a: b, b: a })
        }
      }
      return out
    }
    case 'angle_eq': {
      const out: Fact[] = []
      for (const a of angleForms(f.a)) {
        for (const b of angleForms(f.b)) {
          out.push({ kind: 'angle_eq', a, b })
          out.push({ kind: 'angle_eq', a: b, b: a })
        }
      }
      return out
    }
    case 'angle_measure':
      return angleForms(f.angle).map((a) => ({
        kind: 'angle_measure',
        angle: a,
        degrees: f.degrees,
      }))
    case 'angle_sum': {
      // Product of angle-form choices × all permutations of the sum order.
      const perAngle = f.angles.map(angleForms)
      const combos: Angle[][] = [[]]
      for (const opts of perAngle) {
        const next: Angle[][] = []
        for (const prefix of combos) {
          for (const opt of opts) next.push([...prefix, opt])
        }
        combos.splice(0, combos.length, ...next)
      }
      const perms = permutations(f.angles.length)
      const out: Fact[] = []
      for (const combo of combos) {
        for (const perm of perms) {
          out.push({
            kind: 'angle_sum',
            angles: perm.map((i) => combo[i]!),
            degrees: f.degrees,
          })
        }
      }
      return out
    }
    case 'triangle_congruent': {
      const forms = trianglePairForms(f.t1, f.t2)
      return forms.map(([t1, t2]) => ({ kind: 'triangle_congruent', t1, t2 }))
    }
    case 'triangle_similar': {
      const forms = trianglePairForms(f.t1, f.t2)
      return forms.map(([t1, t2]) => ({ kind: 'triangle_similar', t1, t2 }))
    }
    case 'parallel': {
      const out: Fact[] = []
      for (const a of segForms(f.a)) {
        for (const b of segForms(f.b)) {
          out.push({ kind: 'parallel', a, b })
          out.push({ kind: 'parallel', a: b, b: a })
        }
      }
      return out
    }
    case 'perpendicular': {
      const out: Fact[] = []
      for (const a of segForms(f.a)) {
        for (const b of segForms(f.b)) {
          out.push({ kind: 'perpendicular', a, b })
          out.push({ kind: 'perpendicular', a: b, b: a })
        }
      }
      return out
    }
    case 'segment_exists':
      return segForms(f.s).map((s) => ({ kind: 'segment_exists', s }))
    case 'triangle_exists':
      return triangleForms(f.t).map((t) => ({ kind: 'triangle_exists', t }))
    case 'collinear': {
      const perms = permutations(f.points.length)
      return perms.map((p) => ({
        kind: 'collinear',
        points: p.map((i) => f.points[i]!),
      }))
    }
    case 'between':
      return [
        { kind: 'between', a: f.a, m: f.m, b: f.b },
        { kind: 'between', a: f.b, m: f.m, b: f.a },
      ]
    case 'midpoint':
      return [
        { kind: 'midpoint', m: f.m, a: f.a, b: f.b },
        { kind: 'midpoint', m: f.m, a: f.b, b: f.a },
      ]
    case 'ray_between':
      return [
        { kind: 'ray_between', vertex: f.vertex, a: f.a, m: f.m, b: f.b },
        { kind: 'ray_between', vertex: f.vertex, a: f.b, m: f.m, b: f.a },
      ]
    case 'isosceles':
      return [
        { kind: 'isosceles', t: [f.t[0], f.t[1], f.t[2]] },
        { kind: 'isosceles', t: [f.t[0], f.t[2], f.t[1]] },
      ]
    case 'parallelogram':
      return quadForms(f.q).map((q) => ({ kind: 'parallelogram', q }))
    case 'rectangle':
      return quadForms(f.q).map((q) => ({ kind: 'rectangle', q }))
    case 'rhombus':
      return quadForms(f.q).map((q) => ({ kind: 'rhombus', q }))
    case 'square':
      return quadForms(f.q).map((q) => ({ kind: 'square', q }))
    case 'trapezoid':
      return quadTrapezoidForms(f.q).map((q) => ({ kind: 'trapezoid', q }))
    case 'trapezoid_isosceles':
      return quadTrapezoidForms(f.q).map((q) => ({ kind: 'trapezoid_isosceles', q }))
  }
}

function permutations(n: number): number[][] {
  if (n <= 1) return [Array.from({ length: n }, (_, i) => i)]
  const rest = permutations(n - 1)
  const out: number[][] = []
  for (const p of rest) {
    for (let i = 0; i <= p.length; i++) {
      const copy = [...p]
      copy.splice(i, 0, n - 1)
      out.push(copy)
    }
  }
  return out
}

// Small helper for a Fact->PointName[] used elsewhere.
export function factPoints(f: Fact): PointName[] {
  const out: PointName[] = []
  const push = (p: PointName | readonly PointName[]) => {
    if (Array.isArray(p)) out.push(...p)
    else out.push(p as PointName)
  }
  switch (f.kind) {
    case 'segment_eq':
    case 'parallel':
    case 'perpendicular':
      push(f.a)
      push(f.b)
      break
    case 'angle_eq':
      push(f.a)
      push(f.b)
      break
    case 'angle_measure':
      push(f.angle)
      break
    case 'angle_sum':
      for (const a of f.angles) push(a)
      break
    case 'triangle_congruent':
    case 'triangle_similar':
      push(f.t1)
      push(f.t2)
      break
    case 'segment_exists':
      push(f.s)
      break
    case 'triangle_exists':
    case 'isosceles':
      push(f.t)
      break
    case 'collinear':
      push(f.points)
      break
    case 'between':
      out.push(f.a, f.m, f.b)
      break
    case 'midpoint':
      out.push(f.m, f.a, f.b)
      break
    case 'ray_between':
      out.push(f.vertex, f.a, f.m, f.b)
      break
    case 'parallelogram':
    case 'rectangle':
    case 'rhombus':
    case 'square':
    case 'trapezoid':
    case 'trapezoid_isosceles':
      push(f.q)
      break
  }
  return [...new Set(out)]
}

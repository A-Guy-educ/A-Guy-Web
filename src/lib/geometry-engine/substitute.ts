/**
 * Substitute pattern-variable names with their concrete bindings.
 *
 * The pattern and the returned value have the same shape as a Fact. Any
 * variable name in `binding` gets replaced with the concrete value; any
 * name that isn't in the binding is either left as-is (default) or, if
 * `markUnbound` is set, prefixed with `?`.
 *
 * The `?` prefix disambiguates lemma variables from concrete point
 * names when a diagnostic is shown to the user — otherwise an unbound
 * variable like `B` collides with a real point named `B` in the
 * diagram.
 */
import type { Binding, Fact, Pattern, PointName } from './types.js'

/**
 * Resolve a pattern's `degrees` field (number or numeric-var string)
 * against a binding. Returns a concrete number if the variable is bound to
 * one, the original number if the pattern was concrete, or (when
 * markUnbound) a wildcard-prefixed placeholder string.
 */
function resolveDegrees(
  degrees: number | string,
  binding: Binding,
  markUnbound: boolean,
): number | string {
  if (typeof degrees === 'number') return degrees
  if (degrees in binding) {
    const v = binding[degrees]!
    if (typeof v === 'number') return v
    return v
  }
  return markUnbound ? `?${degrees}` : degrees
}

export function substitute(
  pattern: Pattern,
  binding: Binding,
  { markUnbound = false }: { markUnbound?: boolean } = {},
): Fact {
  const s = (n: PointName): PointName => {
    if (n in binding) {
      const v = binding[n]!
      return typeof v === 'number' ? String(v) : v
    }
    return markUnbound ? `?${n}` : n
  }
  const s3 = (t: readonly [PointName, PointName, PointName]) => [s(t[0]), s(t[1]), s(t[2])] as const
  const s2 = (t: readonly [PointName, PointName]) => [s(t[0]), s(t[1])] as const
  const s4 = (t: readonly [PointName, PointName, PointName, PointName]) =>
    [s(t[0]), s(t[1]), s(t[2]), s(t[3])] as const

  switch (pattern.kind) {
    case 'segment_eq':
      return { kind: 'segment_eq', a: s2(pattern.a), b: s2(pattern.b) }
    case 'segment_exists':
      return { kind: 'segment_exists', s: s2(pattern.s) }
    case 'angle_eq':
      return { kind: 'angle_eq', a: s3(pattern.a), b: s3(pattern.b) }
    case 'angle_measure':
      return {
        kind: 'angle_measure',
        angle: s3(pattern.angle),
        degrees: resolveDegrees(pattern.degrees, binding, markUnbound),
      }
    case 'angle_sum':
      return {
        kind: 'angle_sum',
        angles: pattern.angles.map(s3),
        degrees: resolveDegrees(pattern.degrees, binding, markUnbound),
      }
    case 'triangle_congruent':
      return {
        kind: 'triangle_congruent',
        t1: s3(pattern.t1),
        t2: s3(pattern.t2),
      }
    case 'triangle_similar':
      return {
        kind: 'triangle_similar',
        t1: s3(pattern.t1),
        t2: s3(pattern.t2),
      }
    case 'parallel':
      return { kind: 'parallel', a: s2(pattern.a), b: s2(pattern.b) }
    case 'perpendicular':
      return { kind: 'perpendicular', a: s2(pattern.a), b: s2(pattern.b) }
    case 'triangle_exists':
      return { kind: 'triangle_exists', t: s3(pattern.t) }
    case 'collinear':
      return { kind: 'collinear', points: pattern.points.map(s) }
    case 'between':
      return { kind: 'between', a: s(pattern.a), m: s(pattern.m), b: s(pattern.b) }
    case 'midpoint':
      return { kind: 'midpoint', m: s(pattern.m), a: s(pattern.a), b: s(pattern.b) }
    case 'ray_between':
      return {
        kind: 'ray_between',
        vertex: s(pattern.vertex),
        a: s(pattern.a),
        m: s(pattern.m),
        b: s(pattern.b),
      }
    case 'isosceles':
      return { kind: 'isosceles', t: s3(pattern.t) }
    case 'parallelogram':
      return { kind: 'parallelogram', q: s4(pattern.q) }
    case 'rectangle':
      return { kind: 'rectangle', q: s4(pattern.q) }
    case 'rhombus':
      return { kind: 'rhombus', q: s4(pattern.q) }
    case 'square':
      return { kind: 'square', q: s4(pattern.q) }
    case 'trapezoid':
      return { kind: 'trapezoid', q: s4(pattern.q) }
    case 'trapezoid_isosceles':
      return { kind: 'trapezoid_isosceles', q: s4(pattern.q) }
  }
}

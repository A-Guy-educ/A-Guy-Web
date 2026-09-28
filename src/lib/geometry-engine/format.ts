/** Human-readable fact printer. Ordinary strings, no JSX. */
import type { Fact } from './types'

export function formatFact(f: Fact): string {
  switch (f.kind) {
    case 'segment_eq':
      return `${f.a.join('')} = ${f.b.join('')}`
    case 'angle_eq':
      return `∠${f.a.join('')} = ∠${f.b.join('')}`
    case 'angle_measure':
      return `∠${f.angle.join('')} = ${formatDegrees(f.degrees)}`
    case 'angle_sum':
      return `${f.angles.map((a) => `∠${a.join('')}`).join(' + ')} = ${formatDegrees(f.degrees)}`
    case 'triangle_congruent':
      return `△${f.t1.join('')} ≅ △${f.t2.join('')}`
    case 'triangle_similar':
      return `△${f.t1.join('')} ~ △${f.t2.join('')}`
    case 'parallel':
      return `${f.a.join('')} ∥ ${f.b.join('')}`
    case 'perpendicular':
      return `${f.a.join('')} ⊥ ${f.b.join('')}`
    case 'segment_exists':
      return `${f.s.join('')} (line)`
    case 'triangle_exists':
      return `△${f.t.join('')} exists`
    case 'collinear':
      return `${f.points.join('—')} collinear`
    case 'between':
      return `${f.m} is between ${f.a} and ${f.b}`
    case 'midpoint':
      return `${f.m} is midpoint of ${f.a}${f.b}`
    case 'ray_between':
      return `ray ${f.vertex}${f.m} inside ∠${f.a}${f.vertex}${f.b}`
    case 'isosceles':
      return `△${f.t.join('')} is isosceles (${f.t[0]}${f.t[1]} = ${f.t[0]}${f.t[2]})`
    case 'parallelogram':
      return `${f.q.join('')} is a parallelogram`
    case 'rectangle':
      return `${f.q.join('')} is a rectangle`
    case 'rhombus':
      return `${f.q.join('')} is a rhombus`
    case 'square':
      return `${f.q.join('')} is a square`
    case 'trapezoid':
      return `${f.q.join('')} is a trapezoid`
    case 'trapezoid_isosceles':
      return `${f.q.join('')} is an isosceles trapezoid`
  }
}

export function formatBinding(b: Record<string, string | number>): string {
  return Object.entries(b)
    .map(([k, v]) => `${k}→${v}`)
    .join(', ')
}

function formatDegrees(d: number | string): string {
  if (typeof d === 'number') return `${d}°`
  // Variable — either a placeholder like '?X' (unbound) or a bare var name.
  return `${d}°`
}

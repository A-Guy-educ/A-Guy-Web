import type { Fact } from '@/lib/geometry-engine/types'

export function formatFactHe(f: Fact): string {
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
      return `הקטע ${f.s.join('')}`
    case 'triangle_exists':
      return `△${f.t.join('')} קיים`
    case 'collinear':
      return `${f.points.join('—')} על ישר אחד`
    case 'between':
      return `${f.m} בין ${f.a} ל־${f.b}`
    case 'midpoint':
      return `${f.m} אמצע ${f.a}${f.b}`
    case 'ray_between':
      return `הקרן ${f.vertex}${f.m} בתוך ∠${f.a}${f.vertex}${f.b}`
    case 'isosceles':
      return `△${f.t.join('')} שווה־שוקיים (${f.t[0]}${f.t[1]} = ${f.t[0]}${f.t[2]})`
    case 'parallelogram':
      return `${f.q.join('')} מקבילית`
    case 'rectangle':
      return `${f.q.join('')} מלבן`
    case 'rhombus':
      return `${f.q.join('')} מעוין`
    case 'square':
      return `${f.q.join('')} ריבוע`
    case 'trapezoid':
      return `${f.q.join('')} טרפז`
    case 'trapezoid_isosceles':
      return `${f.q.join('')} טרפז שווה־שוקיים`
  }
}

function formatDegrees(d: number | string): string {
  return `${d}°`
}

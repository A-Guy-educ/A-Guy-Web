/**
 * The optional top-level `interactive` flag on axis and geometry specs.
 * Both schemas are `.strict()`, so without the field any spec that sets it
 * would fail lesson-duplication validation and lesson export.
 */
import { describe, expect, it } from 'vitest'
import { AxisSpecV1Schema, GeometrySpecV1Schema } from '@/infra/contracts'

const axisSpec = {
  kind: 'cartesian',
  units: 1,
  grid: { enabled: true },
  axes: {
    showNumbers: true,
    showLabels: true,
    ticks: 1,
    labels: { x: 'x', y: 'y' },
    origin: { x: 0, y: 0 },
  },
  elements: { points: [], graphs: [] },
}

const geometrySpec = {
  kind: 'euclidean',
  canvas: { width: 600, height: 400 },
  elements: { points: [{ name: 'A', x: 100, y: 100 }], lines: [], circles: [], angles: [] },
}

describe.each([
  ['AxisSpecV1Schema', AxisSpecV1Schema, axisSpec],
  ['GeometrySpecV1Schema', GeometrySpecV1Schema, geometrySpec],
] as const)('%s interactive flag', (_name, schema, base) => {
  it('accepts the field being absent', () => {
    const result = schema.safeParse(base)
    expect(result.success).toBe(true)
    expect(result.success && result.data.interactive).toBeUndefined()
  })

  it.each([true, false])('accepts interactive: %s', (interactive) => {
    const result = schema.safeParse({ ...base, interactive })
    expect(result.success).toBe(true)
    expect(result.success && result.data.interactive).toBe(interactive)
  })

  it.each(['false', 0, null])('rejects non-boolean interactive: %j', (interactive) => {
    expect(schema.safeParse({ ...base, interactive }).success).toBe(false)
  })
})

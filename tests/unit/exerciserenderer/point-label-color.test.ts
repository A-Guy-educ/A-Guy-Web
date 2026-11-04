/**
 * @fileType unit-test
 * @domain graphics
 * @pattern point-label-color
 * @ai-summary Locks that geometry and axis point labels are drawn in the same color as their dot (JSXGraph colors label text via `label.strokeColor`), for explicit and default colors. Mirrors Admin PR #757.
 */

import { describe, expect, it, vi } from 'vitest'
import type { AxisSpecV1, GeometrySpecV1 } from '@/infra/contracts'
import { renderAxisSpec } from '@/ui/web/exerciserenderer/graphics/axisElements'
import { renderGeometrySpec } from '@/ui/web/exerciserenderer/graphics/geometryElements'

type PointAttrs = { strokeColor?: string; label?: { strokeColor?: string } }

function createMockBoard() {
  const create = vi.fn((..._args: unknown[]) => ({ on: vi.fn() }))
  return { board: { create } as unknown as JXG.Board, create }
}

function pointAttrs(create: ReturnType<typeof createMockBoard>['create']): PointAttrs[] {
  return create.mock.calls
    .filter(([type]) => type === 'point')
    .map(([, , attrs]) => attrs as PointAttrs)
}

describe('point label color', () => {
  it('geometry point labels match the dot color, explicit and default', () => {
    const { board, create } = createMockBoard()
    const spec = {
      canvas: { width: 400, height: 300 },
      elements: {
        points: [
          { name: 'A', x: 0, y: 0, color: '#dc2626' },
          { name: 'B', x: 1, y: 1 },
        ],
        lines: [],
        circles: [],
        angles: [],
      },
    } as unknown as GeometrySpecV1

    renderGeometrySpec(board, spec)

    const attrs = pointAttrs(create)
    expect(attrs).toHaveLength(2)
    expect(attrs[0].strokeColor).toBe('#dc2626')
    for (const a of attrs) {
      expect(a.strokeColor).toBeTruthy()
      expect(a.label?.strokeColor).toBe(a.strokeColor)
    }
  })

  it('axis point labels match the dot color, explicit and default', () => {
    const { board, create } = createMockBoard()
    const spec = {
      elements: {
        points: [
          { x: 0, y: 0, label: 'P', type: 'point', color: '#2563eb' },
          { x: 1, y: 1, label: 'Q', type: 'point' },
          { x: 2, y: 2, label: 'H', type: 'hole' },
        ],
        graphs: [],
      },
    } as unknown as AxisSpecV1

    renderAxisSpec(board, spec)

    const attrs = pointAttrs(create)
    expect(attrs).toHaveLength(3)
    expect(attrs[0].strokeColor).toBe('#2563eb')
    for (const a of attrs) {
      expect(a.strokeColor).toBeTruthy()
      expect(a.label?.strokeColor).toBe(a.strokeColor)
    }
  })
})

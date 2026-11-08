import { describe, expect, it } from 'vitest'

import {
  ellipseFromStroke,
  polygonFromStroke,
  snapStroke,
  straightenStroke,
} from '@/ui/web/notebook/LessonNotebook/shape-snap'
import { isStylusTouch } from '@/ui/web/notebook/stylus-touch'

/** A hand-drawn-ish loop: `sweep` turns around (cx, cy), radius wobbling by `wobble`. */
function loop(cx: number, cy: number, rx: number, ry: number, sweep = 2 * Math.PI, wobble = 0) {
  const points: number[] = []
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * sweep
    const r = 1 + wobble * Math.sin(i * 1.7)
    points.push(cx + rx * r * Math.cos(angle), cy + ry * r * Math.sin(angle))
  }
  return points
}

function bounds(points: number[]) {
  const xs = points.filter((_, i) => i % 2 === 0)
  const ys = points.filter((_, i) => i % 2 === 1)
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}

describe('straightenStroke', () => {
  it('snaps a slightly wobbly line to its end points', () => {
    expect(straightenStroke([0, 0, 25, 3, 50, -2, 75, 4, 100, 0])).toEqual([0, 0, 100, 0])
  })

  it('works for diagonal lines', () => {
    expect(straightenStroke([10, 10, 32, 28, 55, 55, 80, 82, 110, 110])).toEqual([10, 10, 110, 110])
  })

  it('leaves a curve freehand', () => {
    expect(straightenStroke([0, 0, 25, 40, 50, 50, 75, 40, 100, 0])).toBeNull()
  })

  it('leaves a closed loop freehand', () => {
    expect(straightenStroke([0, 0, 60, 0, 60, 60, 0, 60, 2, 2])).toBeNull()
  })

  it('ignores dots and short ticks', () => {
    expect(straightenStroke([5, 5])).toBeNull()
    expect(straightenStroke([0, 0, 5, 1, 10, 0])).toBeNull()
  })
})

describe('ellipseFromStroke', () => {
  it('snaps a wobbly circle to a true circle', () => {
    const circle = ellipseFromStroke(loop(200, 200, 80, 74, 2 * Math.PI, 0.06))
    expect(circle).not.toBeNull()
    const { width, height } = bounds(circle!)
    expect(width).toBeCloseTo(height, 0)
  })

  it('keeps a clearly oval loop as an oval', () => {
    const oval = ellipseFromStroke(loop(200, 200, 120, 60))
    expect(oval).not.toBeNull()
    const { width, height } = bounds(oval!)
    expect(width).toBeCloseTo(240, 0)
    expect(height).toBeCloseTo(120, 0)
  })

  it('closes the shape even when the ends left a small gap', () => {
    const circle = ellipseFromStroke(loop(200, 200, 80, 80, 1.9 * Math.PI))!
    expect(circle.slice(0, 2)).toEqual(circle.slice(-2))
  })

  it('leaves an open arc freehand', () => {
    expect(ellipseFromStroke(loop(200, 200, 80, 80, 1.3 * Math.PI))).toBeNull()
  })

  it('leaves a square freehand', () => {
    const square: number[] = []
    for (let i = 0; i <= 10; i++) square.push(i * 10, 0)
    for (let i = 1; i <= 10; i++) square.push(100, i * 10)
    for (let i = 9; i >= 0; i--) square.push(i * 10, 100)
    for (let i = 9; i >= 0; i--) square.push(0, i * 10)
    expect(ellipseFromStroke(square)).toBeNull()
  })

  it('leaves a small handwritten "o" freehand', () => {
    expect(ellipseFromStroke(loop(50, 50, 10, 12))).toBeNull()
  })

  it('leaves a line scribbled back and forth freehand', () => {
    expect(ellipseFromStroke(loop(200, 200, 100, 4))).toBeNull()
  })
})

/** A hand-drawn outline through `corners`, starting partway along the first edge. */
function outline(corners: [number, number][], wobble = 0) {
  const points: number[] = []
  const steps = 16
  const closed = [...corners, corners[0], corners[1]]
  for (let edge = 0; edge < corners.length + 1; edge++) {
    const [ax, ay] = closed[edge]
    const [bx, by] = closed[edge + 1]
    // Starts mid-edge and stops mid-edge, so the ends meet on a side, not a corner.
    const from = edge === 0 ? steps / 2 : 0
    const to = edge === corners.length ? steps / 2 : steps
    for (let i = from; i < to; i++) {
      const jitter = wobble * Math.sin(points.length * 1.7)
      points.push(ax + ((bx - ax) * i) / steps + jitter, ay + ((by - ay) * i) / steps - jitter)
    }
  }
  return points
}

function cornersOf(shape: number[]) {
  const corners: [number, number][] = []
  for (let i = 0; i < shape.length - 2; i += 2) corners.push([shape[i], shape[i + 1]])
  return corners
}

describe('polygonFromStroke', () => {
  it('snaps a wobbly rectangle to a true page-aligned rectangle', () => {
    const shape = polygonFromStroke(
      outline(
        [
          [100, 100],
          [303, 96],
          [300, 202],
          [98, 200],
        ],
        3,
      ),
    )!
    const corners = cornersOf(shape)
    expect(corners).toHaveLength(4)
    expect(shape.slice(0, 2)).toEqual(shape.slice(-2))
    const xs = new Set(corners.map(([x]) => x))
    const ys = new Set(corners.map(([, y]) => y))
    expect(xs.size).toBe(2)
    expect(ys.size).toBe(2)
  })

  it('keeps the tilt of a clearly rotated rectangle', () => {
    const angle = (30 * Math.PI) / 180
    const rotate = (x: number, y: number): [number, number] => [
      400 + x * Math.cos(angle) - y * Math.sin(angle),
      400 + x * Math.sin(angle) + y * Math.cos(angle),
    ]
    const corners = cornersOf(
      polygonFromStroke(
        outline([rotate(-100, -50), rotate(100, -50), rotate(100, 50), rotate(-100, 50)]),
      )!,
    )
    const edges = corners.map(([x, y], i) => {
      const [nx, ny] = corners[(i + 1) % 4]
      return Math.atan2(ny - y, nx - x)
    })
    const tilts = edges.map((edge) => Math.abs(((edge * 180) / Math.PI) % 90))
    for (const tilt of tilts)
      expect(Math.min(Math.abs(tilt - 30), Math.abs(tilt - 60))).toBeLessThan(1)
  })

  it('snaps a triangle to the three corners drawn', () => {
    const corners = cornersOf(
      polygonFromStroke(
        outline([
          [100, 300],
          [300, 300],
          [160, 100],
        ]),
      )!,
    )
    expect(corners).toHaveLength(3)
    for (const [x, y] of [
      [100, 300],
      [300, 300],
      [160, 100],
    ]) {
      expect(corners.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < 3)).toBe(true)
    }
  })

  it('keeps a trapezoid as drawn instead of forcing a rectangle', () => {
    const corners = cornersOf(
      polygonFromStroke(
        outline([
          [100, 300],
          [400, 300],
          [320, 150],
          [180, 150],
        ]),
      )!,
    )
    expect(corners).toHaveLength(4)
    expect(corners.some(([x, y]) => Math.hypot(x - 180, y - 150) < 3)).toBe(true)
  })

  it('leaves shapes with more corners freehand', () => {
    const star: [number, number][] = []
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? 50 : 120
      const angle = (i / 10) * 2 * Math.PI
      star.push([300 + radius * Math.cos(angle), 300 + radius * Math.sin(angle)])
    }
    expect(polygonFromStroke(outline(star))).toBeNull()
  })

  it('leaves an open shape freehand', () => {
    const open = outline([
      [100, 100],
      [300, 100],
      [300, 300],
      [100, 300],
    ]).slice(0, 60)
    expect(polygonFromStroke(open)).toBeNull()
  })
})

describe('snapStroke', () => {
  it('snaps a rectangle and a triangle to a polygon', () => {
    const rectangle: [number, number][] = [
      [100, 100],
      [300, 100],
      [300, 220],
      [100, 220],
    ]
    expect(snapStroke(outline(rectangle))?.shape).toBe('polygon')
    expect(snapStroke(outline(rectangle.slice(0, 3)))?.shape).toBe('polygon')
  })

  it('keeps a 2:1 oval an ellipse rather than a four-cornered shape', () => {
    expect(snapStroke(loop(300, 300, 120, 60))?.shape).toBe('ellipse')
  })

  it('prefers a line when the stroke is straight', () => {
    expect(snapStroke([0, 0, 25, 3, 50, -2, 75, 4, 100, 0])?.shape).toBe('line')
  })

  it('snaps a closed loop to an ellipse', () => {
    expect(snapStroke(loop(200, 200, 80, 80))?.shape).toBe('ellipse')
  })

  it('leaves everything else freehand', () => {
    expect(snapStroke(loop(200, 200, 80, 80, Math.PI))).toBeNull()
  })
})

describe('isStylusTouch', () => {
  const touchEvent = (...types: (string | undefined)[]) =>
    ({ changedTouches: types.map((touchType) => ({ touchType })) }) as unknown as TouchEvent

  it('recognises an Apple Pencil touch', () => {
    expect(isStylusTouch(touchEvent('stylus'))).toBe(true)
  })

  it('treats fingers and browsers without touchType as not a stylus', () => {
    expect(isStylusTouch(touchEvent('direct'))).toBe(false)
    expect(isStylusTouch(touchEvent(undefined))).toBe(false)
  })
})

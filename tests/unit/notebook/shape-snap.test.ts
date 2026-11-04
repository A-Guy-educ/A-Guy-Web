import { describe, expect, it } from 'vitest'

import {
  ellipseFromStroke,
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

describe('snapStroke', () => {
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

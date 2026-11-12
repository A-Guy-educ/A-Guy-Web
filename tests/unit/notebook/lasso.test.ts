import { describe, expect, it } from 'vitest'

import { NOTEBOOK_MAX_STROKES, type NotebookStroke } from '@/infra/types/notebook'
import { notebookPageUpdateSchema } from '@/server/api/schemas/notebook-schemas'
import {
  clampOffset,
  clampScale,
  liftStrokes,
  scaleStrokes,
  strokeHitTester,
  strokesBounds,
  translateStrokes,
} from '@/ui/web/notebook/LessonNotebook/lasso'
import { PEN_SIZES, strokeWidthFor } from '@/ui/web/notebook/LessonNotebook/stroke-render'

const LOOP = [100, 100, 300, 100, 300, 300, 100, 300]
const ink = (...points: number[]): NotebookStroke => ({ ink: 0, points })
const eraser = (...points: number[]): NotebookStroke => ({
  ink: 0,
  erase: true,
  width: 20,
  points,
})

describe('liftStrokes', () => {
  it('selects ink inside the loop and leaves the rest in order', () => {
    const inside = ink(150, 150, 200, 200)
    const outside = ink(500, 500, 600, 600)
    const { selected, rest } = liftStrokes([outside, inside, eraser(700, 700, 720, 720)], LOOP)
    expect(selected).toEqual([inside])
    expect(rest.map((stroke) => stroke.erase ?? false)).toEqual([false, true])
  })

  it('does not catch a stroke that is mostly outside', () => {
    const { selected } = liftStrokes([ink(150, 150, 500, 150, 600, 150, 700, 150)], LOOP)
    expect(selected).toEqual([])
  })

  it('selects a dot', () => {
    expect(liftStrokes([ink(200, 200)], LOOP).selected).toHaveLength(1)
  })

  it('never selects eraser strokes', () => {
    expect(liftStrokes([eraser(150, 150, 200, 200)], LOOP).selected).toEqual([])
  })

  it('cuts out what a later eraser removed, so it cannot reappear', () => {
    const { selected } = liftStrokes([ink(110, 200, 290, 200), eraser(200, 150, 200, 250)], LOOP)
    expect(selected).toHaveLength(2)
    for (const piece of selected) {
      for (let i = 0; i < piece.points.length; i += 2) {
        // Eraser radius 10 plus the ink's own radius 1.5.
        expect(Math.abs(piece.points[i] - 200)).toBeGreaterThanOrEqual(11.5)
      }
    }
  })

  it('ignores erasers drawn before the ink', () => {
    const line = ink(110, 200, 290, 200)
    expect(liftStrokes([eraser(200, 150, 200, 250), line], LOOP).selected).toEqual([line])
  })

  it('selects nothing when the ink was erased completely', () => {
    const wiped = eraser(140, 200, 260, 200)
    expect(liftStrokes([ink(180, 200, 220, 200), wiped], LOOP).selected).toEqual([])
  })

  it('does not change the strokes it was given', () => {
    const strokes = [ink(110, 200, 290, 200), eraser(200, 150, 200, 250)]
    const copy = JSON.parse(JSON.stringify(strokes))
    liftStrokes(strokes, LOOP)
    expect(strokes).toEqual(copy)
  })
})

describe('moving strokes', () => {
  it('translates a copy and leaves the original alone', () => {
    const original = ink(10, 20, 30, 40)
    expect(translateStrokes([original], 5, -5)[0].points).toEqual([15, 15, 35, 35])
    expect(original.points).toEqual([10, 20, 30, 40])
  })

  it('includes the line width in the bounds', () => {
    expect(strokesBounds([{ ink: 0, width: 10, points: [100, 100, 200, 150] }])).toEqual({
      left: 95,
      top: 95,
      right: 205,
      bottom: 155,
    })
  })

  it('keeps a move on the page', () => {
    const bounds = { left: 100, top: 100, right: 200, bottom: 200 }
    expect(clampOffset(bounds, -500, -500, 1000)).toEqual({ dx: -100, dy: -100 })
    expect(clampOffset(bounds, 5000, 5000, 1000)).toEqual({ dx: 700, dy: 800 })
    expect(clampOffset(bounds, 10, 20, 1000)).toEqual({ dx: 10, dy: 20 })
  })
})

describe('resizing strokes', () => {
  it('scales points from the origin and keeps the line width', () => {
    const stroke = { ink: 0, width: 6, points: [100, 100, 300, 200] }
    expect(scaleStrokes([stroke], 100, 100, 0.5)).toEqual([
      { ink: 0, width: 6, points: [100, 100, 200, 150] },
    ])
    expect(stroke.points).toEqual([100, 100, 300, 200])
  })

  it('stops growing at the edge of the page', () => {
    const bounds = { left: 500, top: 0, right: 700, bottom: 100 }
    expect(clampScale(bounds, 5, 1000)).toBe(2)
  })

  it('stops shrinking before the selection disappears', () => {
    const bounds = { left: 0, top: 0, right: 240, bottom: 120 }
    expect(clampScale(bounds, 0.001, 1000)).toBe(0.05)
    expect(clampScale(bounds, 0.5, 1000)).toBe(0.5)
  })
})

describe('strokeHitTester', () => {
  const strokes: NotebookStroke[] = [
    ink(100, 100, 200, 100),
    eraser(100, 100, 200, 100),
    ink(100, 300, 200, 300),
  ]

  it('finds the ink strokes near a point', () => {
    expect(strokeHitTester(strokes)(150, 105, 8)).toEqual([0])
    expect(strokeHitTester(strokes)(150, 200, 8)).toEqual([])
  })

  it('never removes eraser strokes', () => {
    expect(strokeHitTester([eraser(100, 100, 200, 100)])(150, 100, 8)).toEqual([])
  })
})

describe('pen sizes', () => {
  it('saves no width for the regular pen on a normal screen', () => {
    expect(strokeWidthFor(false, 1, PEN_SIZES[1])).toBeUndefined()
  })

  it('saves the width of the thin and thick pens', () => {
    expect(strokeWidthFor(false, 1, PEN_SIZES[0])).toBe(1.5)
    expect(strokeWidthFor(false, 1, PEN_SIZES[2])).toBe(6)
  })

  it('keeps the three pens distinct on a narrow screen', () => {
    const widths = PEN_SIZES.map((size) => strokeWidthFor(false, 0.4, size)!)
    expect(widths[0]).toBeLessThan(widths[1])
    expect(widths[1]).toBeLessThan(widths[2])
  })

  it('does not let the pen size change the eraser', () => {
    expect(strokeWidthFor(true, 1, PEN_SIZES[2])).toBeUndefined()
  })
})

describe('notebook save limits', () => {
  const save = (strokes: NotebookStroke[]) => notebookPageUpdateSchema.safeParse({ strokes })

  it('accepts green ink and every pen width', () => {
    for (const width of PEN_SIZES) {
      expect(save([{ ink: 3, width, points: [1, 1, 2, 2] }]).success).toBe(true)
    }
  })

  it('rejects an ink past the palette', () => {
    expect(save([{ ink: 4, points: [1, 1, 2, 2] }]).success).toBe(false)
  })

  it('enforces the shared stroke limit', () => {
    expect(save(Array(NOTEBOOK_MAX_STROKES + 1).fill(ink(1, 1))).success).toBe(false)
  })
})

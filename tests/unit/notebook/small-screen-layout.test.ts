import { describe, expect, it } from 'vitest'

import { strokeWidthFor } from '@/ui/web/notebook/LessonNotebook/stroke-render'
import { placeActions } from '@/ui/web/notebook/RegionCut/CutSelection'

const layer = (width: number, height: number) => ({ width, height }) as DOMRect

describe('placeActions', () => {
  it('puts the buttons under the selection when they fit', () => {
    const box = { left: 0, top: 0, width: 200, height: 100 }
    expect(placeActions({ left: 300, top: 100 }, box, layer(1000, 800))).toEqual({
      left: 400,
      top: 208,
    })
  })

  it('moves them above a selection at the bottom of the screen', () => {
    const box = { left: 0, top: 0, width: 200, height: 100 }
    expect(placeActions({ left: 300, top: 680 }, box, layer(1000, 800)).top).toBe(628)
  })

  it('keeps them inside a selection that fills the whole screen', () => {
    const box = { left: 0, top: 0, width: 360, height: 700 }
    const { top } = placeActions({ left: 0, top: 0 }, box, layer(360, 700))
    expect(top).toBeGreaterThanOrEqual(0)
    expect(top + 44).toBeLessThanOrEqual(700)
  })

  it('never pushes them past the side of a phone screen', () => {
    const box = { left: 0, top: 0, width: 40, height: 40 }
    const { left } = placeActions({ left: 330, top: 100 }, box, layer(400, 800))
    expect(left).toBe(250)
  })
})

describe('strokeWidthFor', () => {
  it('uses the default width at desktop size', () => {
    expect(strokeWidthFor(false, 1)).toBeUndefined()
    expect(strokeWidthFor(true, 1)).toBeUndefined()
  })

  it('thickens strokes on a phone so they stay visible', () => {
    // A 360px-wide phone shows the 900-unit page at 0.4px per unit.
    expect(strokeWidthFor(false, 0.4)).toBe(5)
    expect(strokeWidthFor(true, 0.4)).toBe(40)
  })
})

import { describe, expect, it } from 'vitest'

import { straightenStroke } from '@/ui/web/notebook/LessonNotebook/straighten'
import { isStylusTouch } from '@/ui/web/notebook/stylus-touch'

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

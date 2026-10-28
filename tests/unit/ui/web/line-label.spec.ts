import { describe, expect, it } from 'vitest'
import { LINE_LABEL_OFFSET_RATIO, lineLabelFontSize } from '@/infra/utils/graphics/line-label'

describe('geometry segment label sizing', () => {
  it('scales the stored font size by 1.25', () => {
    expect(lineLabelFontSize(12)).toBe(15)
  })

  it('falls back to 10 for missing or zero font size', () => {
    expect(lineLabelFontSize()).toBe(12.5)
    expect(lineLabelFontSize(0)).toBe(12.5)
  })

  it('sits 30% closer to the line than the old 0.03 ratio', () => {
    expect(LINE_LABEL_OFFSET_RATIO).toBeCloseTo(0.03 * 0.7)
  })
})

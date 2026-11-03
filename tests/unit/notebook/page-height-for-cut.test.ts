import { describe, expect, it } from 'vitest'

import { NOTEBOOK_MAX_PAGE_HEIGHT } from '@/infra/types/notebook'
import { NEW_PAGE_HEIGHT } from '@/ui/web/notebook/LessonNotebook/useNotebookPages'
import { pageHeightForCut } from '@/ui/web/notebook/RegionCut/useRegionCut'

describe('pageHeightForCut', () => {
  it('gives a short cut a standard page', () => {
    // A one-line exercise: 900 wide in page units → 90 tall, plus solving room.
    expect(pageHeightForCut(1800, 180)).toBe(NEW_PAGE_HEIGHT)
  })

  it('leaves room to solve under a tall cut', () => {
    // 1000×1000 scales to 900×900 on the page, plus 800 to write in.
    expect(pageHeightForCut(1000, 1000)).toBe(1700)
  })

  it('never exceeds the largest page the server accepts', () => {
    expect(pageHeightForCut(100, 10_000)).toBe(NOTEBOOK_MAX_PAGE_HEIGHT)
  })
})

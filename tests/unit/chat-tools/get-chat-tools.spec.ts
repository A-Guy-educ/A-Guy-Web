import { describe, expect, it } from 'vitest'

import type { FormulaSheet } from '@/infra/types/content'
import { getChatTools } from '@/ui/web/chat-tools/getChatTools'

const sheet = { id: 'sheet-1', title: 'Formula sheet' } as FormulaSheet

describe('getChatTools', () => {
  it('offers chat, answers and calculator by default', () => {
    expect(getChatTools({})).toEqual(['chat', 'answers', 'calculator'])
  })

  it('offers formulas for an attached sheet', () => {
    expect(getChatTools({ formulaSheet: sheet })).toContain('formulas')
  })

  it("falls back to the lesson's formulas text when there is no sheet", () => {
    expect(getChatTools({ formulaSheet: null, formulas: '$a^2+b^2=c^2$' })).toEqual([
      'chat',
      'answers',
      'formulas',
      'calculator',
    ])
  })

  it('ignores formulas text with nothing to list', () => {
    expect(getChatTools({ formulas: '  \n - \n' })).not.toContain('formulas')
  })

  it('offers the sheet only with a preview', () => {
    expect(getChatTools({ sheetPreview: 'page' })).toContain('sheet')
    expect(getChatTools({ sheetPreview: undefined })).not.toContain('sheet')
  })
})

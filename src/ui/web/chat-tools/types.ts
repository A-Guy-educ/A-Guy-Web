import type { ReactNode } from 'react'

import type { FormulaSheet } from '@/infra/types/content'

/** Everything the chat column can show; `chat` is the conversation itself. */
export type ChatToolId = 'chat' | 'answers' | 'formulas' | 'calculator' | 'sheet'

/** What a lesson view offers in the chat column's tool rail (desktop only). */
export interface ChatToolsOptions {
  /** Shows the formula-sheet tool when present. */
  formulaSheet?: FormulaSheet | null
  /**
   * The miniature of the lesson material. Mounted only while the sheet tool
   * is open, so it should read the current page on mount. Omit to hide the tool.
   */
  sheetPreview?: ReactNode
}

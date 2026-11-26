import type { ReactNode } from 'react'

import type { FormulaSheet } from '@/infra/types/content'

/** Everything the chat column can show; `chat` is the conversation itself. */
export type ChatToolId = 'chat' | 'answers' | 'formulas' | 'calculator' | 'sheet'

/**
 * What a lesson view offers next to its chat: the tool rail on desktop, the
 * chat's "+" menu on mobile.
 */
export interface ChatToolsOptions {
  /** Shows the formula-sheet tool when present. */
  formulaSheet?: FormulaSheet | null
  /** The lesson's own formulas text (`lesson.formulas`); the formulas tool falls back to it without a sheet. */
  formulas?: string | null
  /** Fills the answers tool (e.g. the scroll view's solutions). Omit to keep the coming-soon placeholder. */
  answers?: ReactNode
  /**
   * The miniature of the lesson material. Mounted only while the sheet tool
   * is open, so it should read the current page on mount. Omit to hide the tool.
   */
  sheetPreview?: ReactNode
}

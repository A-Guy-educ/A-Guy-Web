import { splitExplanationBullets } from '@/lib/lessons/splitExplanationBullets'

import type { ChatToolId, ChatToolsOptions } from './types'

/** The tools a lesson view offers, in rail order. */
export function getChatTools(options: ChatToolsOptions): ChatToolId[] {
  const hasFormulas =
    Boolean(options.formulaSheet) || splitExplanationBullets(options.formulas).length > 0
  return [
    'chat',
    'answers',
    ...(hasFormulas ? (['formulas'] as const) : []),
    'calculator',
    ...(options.sheetPreview ? (['sheet'] as const) : []),
  ]
}

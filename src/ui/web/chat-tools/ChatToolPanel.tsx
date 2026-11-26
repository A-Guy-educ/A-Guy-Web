'use client'

import { cn } from '@/infra/utils/ui'
import { CalculatorPanel } from './calculator/CalculatorPanel'
import { FinalAnswersPanel } from './FinalAnswersPanel'
import { FormulasPanel } from './FormulasPanel'
import type { ChatToolId, ChatToolsOptions } from './types'

interface ChatToolPanelProps {
  tool: ChatToolId
  options: ChatToolsOptions
  onBackToChat: () => void
}

/** What a tool shows in place of the chat. Renders nothing for the chat itself. */
export function ChatToolPanel({ tool, options, onBackToChat }: ChatToolPanelProps) {
  const panel = (() => {
    switch (tool) {
      case 'answers':
        return options.answers ?? <FinalAnswersPanel onBackToChat={onBackToChat} />
      case 'formulas':
        return <FormulasPanel sheet={options.formulaSheet} formulas={options.formulas} />
      case 'calculator':
        return <CalculatorPanel />
      case 'sheet':
        return options.sheetPreview ?? null
      default:
        return null
    }
  })()
  if (!panel) return null

  return (
    <div
      className={cn(
        'min-h-0 flex-1 bg-card',
        tool === 'sheet' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-contain',
      )}
    >
      {panel}
    </div>
  )
}

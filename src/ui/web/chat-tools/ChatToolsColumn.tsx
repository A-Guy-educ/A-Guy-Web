'use client'

import type { ReactNode } from 'react'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { FormulaSheetContent } from '@/ui/web/shared/FormulaSheetViewer/FormulaSheetContent'
import { CalculatorPanel } from './calculator/CalculatorPanel'
import { ChatCollapseButton, ChatToolRail } from './ChatToolRail'
import { FinalAnswersPanel } from './FinalAnswersPanel'
import type { ChatToolId, ChatToolsOptions } from './types'
import type { ChatToolsState } from './useChatTools'

interface ChatToolsColumnProps {
  options: ChatToolsOptions
  state: ChatToolsState
  rtl: boolean
  /** The chat itself. Stays mounted (hidden) while a tool is open or the column is collapsed. */
  children: ReactNode
}

/**
 * Desktop chat column with a tool rail in its header. Tools take over the
 * column instead of covering the material; collapsed, the column shrinks to
 * the vertical rail. The element order is fixed so the chat never remounts.
 */
export function ChatToolsColumn({ options, state, rtl, children }: ChatToolsColumnProps) {
  const t = useTranslations('courses.chatTools')
  const { activeTool, collapsed, selectTool, toggleCollapsed } = state

  const tools: ChatToolId[] = [
    'chat',
    'answers',
    ...(options.formulaSheet ? (['formulas'] as const) : []),
    'calculator',
    ...(options.sheetPreview ? (['sheet'] as const) : []),
  ]
  // A tool can disappear (e.g. switching to a video file drops the sheet).
  const shownTool = tools.includes(activeTool) ? activeTool : 'chat'
  const showChat = !collapsed && shownTool === 'chat'

  const panel = (() => {
    if (collapsed) return null
    switch (shownTool) {
      case 'answers':
        return <FinalAnswersPanel onBackToChat={() => selectTool('chat')} />
      case 'formulas':
        return options.formulaSheet ? (
          <div className="p-card-padding-sm">
            <p className="mb-3 text-body-sm font-semibold text-foreground">
              {options.formulaSheet.title}
            </p>
            <FormulaSheetContent sheet={options.formulaSheet} />
          </div>
        ) : null
      case 'calculator':
        return <CalculatorPanel />
      case 'sheet':
        return options.sheetPreview
      default:
        return null
    }
  })()

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {collapsed ? (
        <ChatToolRail
          tools={tools}
          activeTool={shownTool}
          collapsed
          rtl={rtl}
          onSelect={selectTool}
          onToggleCollapsed={toggleCollapsed}
        />
      ) : (
        <div className="flex h-12 shrink-0 items-center gap-content-gap-xs border-b border-border bg-card px-2.5">
          <ChatCollapseButton collapsed={false} rtl={rtl} onToggle={toggleCollapsed} />
          <h2 className="truncate text-body-sm font-semibold text-foreground">{t(shownTool)}</h2>
          <ChatToolRail
            tools={tools}
            activeTool={shownTool}
            collapsed={false}
            rtl={rtl}
            onSelect={selectTool}
            onToggleCollapsed={toggleCollapsed}
          />
        </div>
      )}

      <div className={cn('min-h-0 flex-1 flex-col', showChat ? 'flex' : 'hidden')}>{children}</div>

      {panel && (
        <div
          className={cn(
            'min-h-0 flex-1 bg-card',
            shownTool === 'sheet'
              ? 'flex flex-col overflow-hidden'
              : 'overflow-y-auto overscroll-contain',
          )}
        >
          {panel}
        </div>
      )}
    </div>
  )
}

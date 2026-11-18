'use client'

import {
  Calculator,
  FileText,
  ListChecks,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sigma,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { ChatToolId } from './types'

export const CHAT_TOOL_ICONS: Record<ChatToolId, LucideIcon> = {
  chat: MessageSquareText,
  answers: ListChecks,
  formulas: Sigma,
  calculator: Calculator,
  sheet: FileText,
}

interface ChatToolRailProps {
  tools: ChatToolId[]
  activeTool: ChatToolId
  /** Collapsed = the vertical strip that replaces the whole chat column. */
  collapsed: boolean
  rtl: boolean
  onSelect: (tool: ChatToolId) => void
  onToggleCollapsed: () => void
}

/** Collapse / expand button. The chat sits at the inline end, so the panel icon mirrors with direction. */
export function ChatCollapseButton({
  collapsed,
  rtl,
  onToggle,
}: {
  collapsed: boolean
  rtl: boolean
  onToggle: () => void
}) {
  const t = useTranslations('courses')
  const label = collapsed ? t('expandChat') : t('collapseChat')
  const Icon = rtl
    ? collapsed
      ? PanelLeftOpen
      : PanelLeftClose
    : collapsed
      ? PanelRightOpen
      : PanelRightClose
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      className={cn(
        'flex shrink-0 items-center justify-center text-muted-foreground transition-colors duration-normal hover:bg-primary/10 hover:text-primary',
        collapsed ? 'h-9 w-9 rounded-full border border-border bg-muted/60' : 'h-8 w-8 rounded-lg',
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </button>
  )
}

export function ChatToolRail({
  tools,
  activeTool,
  collapsed,
  rtl,
  onSelect,
  onToggleCollapsed,
}: ChatToolRailProps) {
  const t = useTranslations('courses.chatTools')

  const buttons = tools.map((tool) => {
    const Icon = CHAT_TOOL_ICONS[tool]
    const active = tool === activeTool
    return (
      <button
        key={tool}
        type="button"
        onClick={() => onSelect(tool)}
        aria-label={t(tool)}
        title={t(tool)}
        aria-pressed={active}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full border transition-colors duration-normal',
          collapsed ? 'h-9 w-9' : 'h-8 w-8',
          active
            ? 'border-primary/25 bg-primary/10 text-primary'
            : 'border-transparent text-muted-foreground hover:border-primary/15 hover:bg-primary/5 hover:text-primary',
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>
    )
  })

  if (collapsed) {
    return (
      <div className="flex h-full w-full flex-col items-center gap-3 bg-card px-1 py-3">
        <ChatCollapseButton collapsed rtl={rtl} onToggle={onToggleCollapsed} />
        <nav
          aria-label={t('railLabel')}
          className="flex w-full flex-col items-center gap-content-gap-xs border-t border-border pt-3"
        >
          {buttons}
        </nav>
      </div>
    )
  }

  return (
    <nav aria-label={t('railLabel')} className="ms-auto flex items-center gap-1">
      {buttons}
    </nav>
  )
}

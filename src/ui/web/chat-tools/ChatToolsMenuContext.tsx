'use client'

import { createContext, useContext } from 'react'

import { useTranslations } from '@/ui/web/providers/I18n'
import type { MathPickerEntry } from '@/ui/web/shared/MathInput/MathPicker'
import { CHAT_TOOL_ICONS } from './ChatToolRail'
import type { ChatToolId } from './types'

interface ChatToolsMenu {
  tools: ChatToolId[]
  onSelect: (tool: ChatToolId) => void
}

const ChatToolsMenuContext = createContext<ChatToolsMenu | null>(null)

/** Mobile has no tool rail, so the workspace hands its tools to the chat's "+" menu. */
export const ChatToolsMenuProvider = ChatToolsMenuContext.Provider

/** The "+" menu entries for the surrounding workspace's tools; empty outside one. */
export function useChatToolsMenuEntries(): MathPickerEntry[] {
  const menu = useContext(ChatToolsMenuContext)
  const t = useTranslations('courses.chatTools')
  if (!menu) return []
  return menu.tools.map((tool) => {
    const Icon = CHAT_TOOL_ICONS[tool]
    return {
      key: tool,
      label: t(tool),
      symbol: <Icon className="h-4 w-4" />,
      onClick: () => menu.onSelect(tool),
    }
  })
}

'use client'

import { useCallback, useEffect, useState } from 'react'

import { CHAT_ATTACH_FILES_EVENT } from '@/ui/web/chat/attach-files-event'
import type { ChatToolId } from './types'

export interface ChatToolsState {
  activeTool: ChatToolId
  collapsed: boolean
  /**
   * Open a tool. From the collapsed rail this expands straight into it;
   * picking the open tool again returns to the chat.
   */
  selectTool: (tool: ChatToolId) => void
  toggleCollapsed: () => void
}

export function useChatTools(): ChatToolsState {
  const [activeTool, setActiveTool] = useState<ChatToolId>('chat')
  const [collapsed, setCollapsed] = useState(false)

  const selectTool = useCallback(
    (tool: ChatToolId) => {
      if (collapsed) {
        setCollapsed(false)
        setActiveTool(tool)
        return
      }
      setActiveTool((current) => (current === tool ? 'chat' : tool))
    },
    [collapsed],
  )

  const toggleCollapsed = useCallback(() => setCollapsed((value) => !value), [])

  // A notebook cut sent to the chat lands in the composer, so bring it into
  // view — the chat stays mounted while hidden, so the attachment isn't lost.
  useEffect(() => {
    const showChat = () => {
      setCollapsed(false)
      setActiveTool('chat')
    }
    window.addEventListener(CHAT_ATTACH_FILES_EVENT, showChat)
    return () => window.removeEventListener(CHAT_ATTACH_FILES_EVENT, showChat)
  }, [])

  return { activeTool, collapsed, selectTool, toggleCollapsed }
}

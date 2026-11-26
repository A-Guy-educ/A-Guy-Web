'use client'

import { isRTL } from '@/i18n/config'
import { cn } from '@/infra/utils/ui'
import {
  ChatToolPanel,
  ChatToolsMenuProvider,
  getChatTools,
  type ChatToolId,
  type ChatToolsOptions,
  type ChatToolsState,
} from '@/ui/web/chat-tools'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import React, { type ReactElement } from 'react'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'

/** Room for the floating close button above the chat. */
const TOP_BAR_PADDING = 'pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0'
const TOP_BAR_TOP = { top: 'calc(0.75rem + env(safe-area-inset-top))' }

interface MobileChatPanelProps {
  chatContent: ReactElement
  displayMode?: 'full' | 'input-only'
  isMobile?: boolean
  viewMode?: 'PDF' | 'Chat'
  onModeToggle?: () => void
  onChatInteraction?: () => void
  onBackToExercise: () => void
  /**
   * The desktop rail's tools, offered from the chat's "+" menu. An open tool
   * replaces the chat (which stays mounted) until the student goes back.
   */
  chatTools?: ChatToolsOptions
  chatToolsState: ChatToolsState
}

export function MobileChatPanel({
  chatContent,
  displayMode,
  isMobile,
  viewMode,
  onModeToggle,
  onChatInteraction,
  onBackToExercise,
  chatTools,
  chatToolsState,
}: MobileChatPanelProps) {
  const t = useTranslations('courses')
  const tTools = useTranslations('courses.chatTools')
  const locale = useLocale()
  const rtl = isRTL(locale as 'en' | 'he')

  // The miniature sheet is left out: on mobile the material itself is one tap away.
  const menuTools: ChatToolId[] = chatTools
    ? getChatTools(chatTools).filter((tool) => tool !== 'chat' && tool !== 'sheet')
    : []
  const { activeTool, selectTool } = chatToolsState
  const openTool = chatTools && menuTools.includes(activeTool) ? activeTool : null
  const backToChat = () => selectTool('chat')

  return (
    <ChatToolsMenuProvider value={chatTools ? { tools: menuTools, onSelect: selectTool } : null}>
      <div className="relative h-full flex flex-col">
        {openTool && (
          <div
            style={TOP_BAR_TOP}
            className="lg:hidden absolute inset-x-3 z-20 flex h-9 items-center gap-content-gap-xs pe-12"
          >
            <button
              type="button"
              onClick={backToChat}
              aria-label={tTools('backToChat')}
              title={tTools('backToChat')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-elevation-2 backdrop-blur transition-colors duration-normal hover:bg-muted"
            >
              {rtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>
            <h2 className="truncate text-body-sm font-semibold text-foreground">
              {tTools(openTool)}
            </h2>
          </div>
        )}
        <button
          type="button"
          onClick={onBackToExercise}
          aria-label={t('backToExercise')}
          style={TOP_BAR_TOP}
          className={cn(
            'lg:hidden absolute z-20 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-elevation-2 backdrop-blur transition-colors duration-normal hover:bg-muted',
            rtl ? 'left-3' : 'right-3',
          )}
        >
          <X className="w-5 h-5" />
        </button>
        <div className={cn('flex-1 min-h-0', TOP_BAR_PADDING, openTool && 'hidden')}>
          {React.cloneElement(
            chatContent as React.ReactElement<{
              displayMode?: 'full' | 'input-only'
              isMobile?: boolean
              viewMode?: 'PDF' | 'Chat'
              onModeToggle?: () => void
              onChatInteraction?: () => void
            }>,
            {
              displayMode,
              isMobile,
              viewMode,
              onModeToggle,
              onChatInteraction,
            },
          )}
        </div>
        {openTool && chatTools && (
          <div className={cn('flex flex-1 min-h-0 flex-col', TOP_BAR_PADDING)}>
            <ChatToolPanel tool={openTool} options={chatTools} onBackToChat={backToChat} />
          </div>
        )}
      </div>
    </ChatToolsMenuProvider>
  )
}

/**
 * @fileType component
 * @domain ui
 * @pattern chat-callout
 * @ai-summary Renders a color+icon callout for a chat paragraph (note / example / mistake / tip / guiding question). Wired up via remarkChatCallouts + custom `p` override in ChatMessageContent.
 */

'use client'

import { cn } from '@/infra/utils/ui'
import { AlertCircle, BookOpen, HelpCircle, Info, Lightbulb, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ChatCalloutKind } from './remark-chat-callouts'

interface ChatCalloutProps {
  kind: ChatCalloutKind
  children: ReactNode
}

const KIND_ICON: Record<ChatCalloutKind, LucideIcon> = {
  note: Info,
  example: BookOpen,
  mistake: AlertCircle,
  tip: Lightbulb,
  guiding: HelpCircle,
}

export function ChatCallout({ kind, children }: ChatCalloutProps) {
  const Icon = KIND_ICON[kind]
  return (
    <div
      className={cn(
        'chat-callout',
        `chat-callout-${kind}`,
        'flex items-start gap-content-gap-xs w-full my-4 rounded-lg border-s-4 p-card-padding-sm',
      )}
    >
      <Icon className="chat-callout-icon w-5 h-5 shrink-0 mt-0.5" aria-hidden />
      <div className="chat-callout-body min-w-0 flex-1 leading-relaxed">{children}</div>
    </div>
  )
}

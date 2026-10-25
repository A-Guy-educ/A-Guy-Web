'use client'

import { QuestionWithAttachment } from '@/ui/web/exerciserenderer/blocks/QuestionWithAttachment'
import { renderQuestionAttachment } from '@/ui/web/exerciserenderer/blocks/renderQuestionAttachment'
import type { QuestionAttachment } from '@/ui/web/exerciserenderer/types'
import type { ReactNode } from 'react'

interface ChatQuestionLayoutProps {
  blockId: string
  attachment?: QuestionAttachment
  /**
   * Stack prompt → sketch → answer area instead of the authored
   * `textLeft/textRight/textAbove/textBelow` layout. ExerciseSectionBubble
   * turns it on for mobile, where a side-by-side layout collapses to a
   * column and would otherwise put the sketch above or below the whole
   * question.
   */
  attachmentAfterPrompt?: boolean
  prompt: ReactNode
  answer: ReactNode
}

/**
 * Shared frame for the chat-native question bubbles. Without an attachment
 * it's just prompt + answer. With one, the admin-authored sketch (svg /
 * geometry / axis) renders through the same QuestionWithAttachment slot as
 * Interactive — or, when `attachmentAfterPrompt` is set, between the prompt
 * and the answer area. The outer ExerciseSectionBubble already installs
 * MediaMapProvider, so SvgRenderer can resolve any mediaIds the attachment
 * references.
 */
export function ChatQuestionLayout({
  blockId,
  attachment,
  attachmentAfterPrompt,
  prompt,
  answer,
}: ChatQuestionLayoutProps) {
  if (attachment && attachmentAfterPrompt) {
    return (
      <div className="flex flex-col gap-content-gap">
        {prompt}
        {renderQuestionAttachment(blockId, attachment)}
        {answer}
      </div>
    )
  }

  const questionContent = (
    <div className="flex flex-col gap-content-gap">
      {prompt}
      {answer}
    </div>
  )

  if (!attachment) return questionContent

  return (
    <QuestionWithAttachment
      layout={attachment.layout}
      question={questionContent}
      attachment={renderQuestionAttachment(blockId, attachment)}
    />
  )
}

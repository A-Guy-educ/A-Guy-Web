/**
 * @fileType unit-test
 * @domain chat-lesson
 * @pattern ui-test, layout
 * @ai-summary ChatQuestionLayout stacks prompt → sketch → answer on mobile and
 *             keeps the authored QuestionWithAttachment layout otherwise.
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { QuestionAttachment } from '@/ui/web/exerciserenderer/types'
import { ChatQuestionLayout } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/bubbles/ChatQuestionLayout'

vi.mock('@/ui/web/exerciserenderer/blocks/renderQuestionAttachment', () => ({
  renderQuestionAttachment: () => <div data-testid="sketch" />,
}))

// `textRight` puts the attachment first in the DOM on desktop — the case
// where mobile used to show the sketch above the prompt.
const attachment = { kind: 'svg', layout: 'textRight' } as unknown as QuestionAttachment

function renderLayout(attachmentAfterPrompt: boolean) {
  render(
    <ChatQuestionLayout
      blockId="q1"
      attachment={attachment}
      attachmentAfterPrompt={attachmentAfterPrompt}
      prompt={<p data-testid="prompt" />}
      answer={<div data-testid="answer" />}
    />,
  )
  return ['prompt', 'sketch', 'answer'].map((id) => screen.getByTestId(id))
}

function follows(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

describe('ChatQuestionLayout', () => {
  it('stacks prompt → sketch → answer when attachmentAfterPrompt is set', () => {
    const [prompt, sketch, answer] = renderLayout(true)
    expect(follows(prompt, sketch)).toBe(true)
    expect(follows(sketch, answer)).toBe(true)
  })

  it('keeps the authored layout (sketch outside the question column) otherwise', () => {
    const [prompt, sketch, answer] = renderLayout(false)
    expect(follows(sketch, prompt)).toBe(true)
    expect(follows(prompt, answer)).toBe(true)
  })

  it('renders prompt and answer only when there is no attachment', () => {
    render(
      <ChatQuestionLayout
        blockId="q1"
        attachmentAfterPrompt
        prompt={<p data-testid="prompt" />}
        answer={<div data-testid="answer" />}
      />,
    )
    expect(screen.queryByTestId('sketch')).not.toBeInTheDocument()
    expect(screen.getByTestId('answer')).toBeInTheDocument()
  })
})

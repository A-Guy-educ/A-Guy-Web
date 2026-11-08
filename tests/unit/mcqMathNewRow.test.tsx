// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { ChatQuestionSelectBubble } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/bubbles/ChatQuestionSelectBubble'
import { McqQuestion } from '@/ui/web/exerciserenderer/questions/McqQuestion'
import type { QuestionSelectMcqBlock } from '@/ui/web/exerciserenderer/types'

vi.mock('@/ui/web/providers/I18n', () => ({ useTranslations: () => (key: string) => key }))

const WRAPS_WHEN_MATH_NEEDS_ROW = 'has-[[data-math-fit=newline]]:flex-wrap'
const TAKES_OWN_ROW = [
  'has-[[data-math-fit=newline]]:order-last',
  'has-[[data-math-fit=newline]]:basis-full',
]

function richText(value: string) {
  return { type: 'rich_text' as const, format: 'md-math-v1' as const, value, mediaIds: [] }
}

function mcq(optionCount: number, multiSelect = false): QuestionSelectMcqBlock {
  const options = ['A', 'B', 'C'].slice(0, optionCount).map((label) => ({
    id: `opt-${label}`,
    content: richText(label),
  }))
  return {
    id: 'q',
    type: 'question_select',
    variant: 'mcq',
    selectionMode: multiSelect ? 'multiple' : 'single',
    prompt: richText('Pick'),
    answer: { multiSelect, options, correctOptionIds: ['opt-A'] },
  }
}

function renderMcq(question: QuestionSelectMcqBlock) {
  return render(
    <McqQuestion
      question={question}
      answer={{ type: 'mcq', selectedIds: [] }}
      onChange={vi.fn()}
      disabled={false}
      checkResult={null}
      t={(key) => key}
    />,
  )
}

function expectNewRowLayout(row: Element, content: Element) {
  expect(row.classList.contains(WRAPS_WHEN_MATH_NEEDS_ROW)).toBe(true)
  TAKES_OWN_ROW.forEach((name) => expect(content.classList.contains(name)).toBe(true))
}

describe('MCQ options can move wrapped math to its own row', () => {
  afterEach(cleanup)

  it('applies to the interactive option cards', () => {
    const { container } = renderMcq(mcq(3))
    const label = container.querySelector('label') as HTMLElement
    expectNewRowLayout(label, label.lastElementChild as Element)
  })

  it('leaves the two-option buttons alone, as nothing sits beside the math', () => {
    const { container } = renderMcq(mcq(2))
    expect(container.querySelector(`[class*="data-math-fit"]`)).toBeNull()
  })

  it('applies to single-select chat options', () => {
    render(<ChatQuestionSelectBubble block={mcq(3)} onSubmit={vi.fn()} />)
    const button = screen.getByRole('button', { name: /^A$/ })
    expectNewRowLayout(button, button.firstElementChild as Element)
  })

  it('applies to multi-select chat options', () => {
    render(<ChatQuestionSelectBubble block={mcq(3, true)} onSubmit={vi.fn()} />)
    const button = screen.getByRole('button', { name: /^A$/ })
    expectNewRowLayout(button, button.firstElementChild as Element)
  })
})

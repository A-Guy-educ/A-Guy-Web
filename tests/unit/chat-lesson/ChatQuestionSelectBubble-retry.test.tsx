// @vitest-environment jsdom
import { ChatQuestionSelectBubble } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/bubbles/ChatQuestionSelectBubble'
import type {
  QuestionSelectMcqBlock,
  QuestionSelectTrueFalseBlock,
} from '@/ui/web/exerciserenderer/types'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

function richText(value: string) {
  return { type: 'rich_text' as const, format: 'md-math-v1' as const, value, mediaIds: [] }
}

function makeThreeOptionMcq(): QuestionSelectMcqBlock {
  return {
    id: 'q-3opt',
    type: 'question_select',
    variant: 'mcq',
    selectionMode: 'single',
    prompt: richText('Pick one'),
    answer: {
      multiSelect: false,
      options: [
        { id: 'opt-a', content: richText('A') },
        { id: 'opt-b', content: richText('B') },
        { id: 'opt-c', content: richText('C') },
      ],
      correctOptionIds: ['opt-a'],
    },
  }
}

function makeTwoOptionTrueFalse(): QuestionSelectTrueFalseBlock {
  return {
    id: 'q-tf',
    type: 'question_select',
    variant: 'true_false',
    prompt: richText('Is it true?'),
    options: [
      { id: 'tf-true', label: richText('True') },
      { id: 'tf-false', label: richText('False') },
    ],
    answer: { correctOptionId: 'tf-true' },
  }
}

describe('ChatQuestionSelectBubble — Task 3 retry mode (3+ option MCQ)', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('first wrong pick does NOT call onSubmit and shows the retry hint CTA', () => {
    const onSubmit = vi.fn()
    const onHintRequest = vi.fn()
    render(
      <ChatQuestionSelectBubble
        block={makeThreeOptionMcq()}
        onSubmit={onSubmit}
        onHintRequest={onHintRequest}
        retryHintLabel="Give me a hint"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^B$/ }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Give me a hint' })).not.toBeNull()
    // The wrongly-picked option stays disabled; the correct + remaining stay clickable.
    expect(screen.getByRole('button', { name: /^B$/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /^A$/ }).hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: /^C$/ }).hasAttribute('disabled')).toBe(false)
  })

  it('hint CTA fires onHintRequest with the wrong + correct choices and then hides', () => {
    const onHintRequest = vi.fn()
    render(
      <ChatQuestionSelectBubble
        block={makeThreeOptionMcq()}
        onSubmit={() => {}}
        onHintRequest={onHintRequest}
        retryHintLabel="Give me a hint"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^B$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Give me a hint' }))

    expect(onHintRequest).toHaveBeenCalledTimes(1)
    expect(onHintRequest).toHaveBeenCalledWith('q-3opt', 'B', 'A')
    // After firing, the CTA auto-hides — one hint per block.
    expect(screen.queryByRole('button', { name: 'Give me a hint' })).toBeNull()
  })

  it('second correct pick calls onSubmit with isCorrect=true', () => {
    const onSubmit = vi.fn()
    render(
      <ChatQuestionSelectBubble
        block={makeThreeOptionMcq()}
        onSubmit={onSubmit}
        onHintRequest={() => {}}
        retryHintLabel="Give me a hint"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^B$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^A$/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('q-3opt', 'A', true)
  })

  it('second wrong pick calls onSubmit with isCorrect=false; no third attempt allowed', () => {
    const onSubmit = vi.fn()
    render(
      <ChatQuestionSelectBubble
        block={makeThreeOptionMcq()}
        onSubmit={onSubmit}
        onHintRequest={() => {}}
        retryHintLabel="Give me a hint"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^B$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^C$/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('q-3opt', 'C', false)
    // All three options are now locked; no third attempt UI is visible.
    expect(screen.getByRole('button', { name: /^A$/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /^B$/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /^C$/ }).hasAttribute('disabled')).toBe(true)
  })

  it('persists wrong attempts + hint-shown so refresh re-mount cannot re-fire the hint', () => {
    const exerciseId = 'ex1'
    const onHintRequestFirst = vi.fn()
    const { unmount } = render(
      <ChatQuestionSelectBubble
        block={makeThreeOptionMcq()}
        exerciseId={exerciseId}
        onSubmit={() => {}}
        onHintRequest={onHintRequestFirst}
        retryHintLabel="Give me a hint"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^B$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Give me a hint' }))
    expect(onHintRequestFirst).toHaveBeenCalledTimes(1)
    unmount()

    const onHintRequestSecond = vi.fn()
    render(
      <ChatQuestionSelectBubble
        block={makeThreeOptionMcq()}
        exerciseId={exerciseId}
        onSubmit={() => {}}
        onHintRequest={onHintRequestSecond}
        retryHintLabel="Give me a hint"
      />,
    )
    // Hint already fired on the previous session; CTA stays hidden.
    expect(screen.queryByRole('button', { name: 'Give me a hint' })).toBeNull()
    // Prior wrong attempt stays locked.
    expect(screen.getByRole('button', { name: /^B$/ }).hasAttribute('disabled')).toBe(true)
    // Remaining options are still live.
    expect(screen.getByRole('button', { name: /^A$/ }).hasAttribute('disabled')).toBe(false)
    expect(onHintRequestSecond).not.toHaveBeenCalled()
  })
})

describe('ChatQuestionSelectBubble — 2-option true/false stays single-pick (no retry)', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('first wrong pick calls onSubmit immediately — no hint CTA appears', () => {
    const onSubmit = vi.fn()
    const onHintRequest = vi.fn()
    render(
      <ChatQuestionSelectBubble
        block={makeTwoOptionTrueFalse()}
        onSubmit={onSubmit}
        onHintRequest={onHintRequest}
        retryHintLabel="Give me a hint"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^False$/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('q-tf', 'False', false)
    expect(onHintRequest).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Give me a hint' })).toBeNull()
  })
})

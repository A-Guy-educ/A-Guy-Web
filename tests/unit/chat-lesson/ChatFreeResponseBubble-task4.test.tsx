// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// MixedMathInput wraps a MathLive `<math-field>` web component (dynamically
// imported). jsdom can't drive it with native change/submit events, and these
// tests are about the submit pipeline (local match / server AI / quota), not
// the input UI itself — so swap in a plain-input test double that still
// honours the `value` / `onChange` / `onEnterKey` / `placeholder` contract.
vi.mock('@/ui/web/shared/MathInput/MixedMathInput', async () => {
  const React = await import('react')
  type Props = {
    value: string
    onChange: (v: string) => void
    onEnterKey?: () => void
    disabled?: boolean
    placeholder?: string
  }
  const MixedMathInput = React.forwardRef<unknown, Props>(function MixedMathInputMock(
    { value, onChange, onEnterKey, disabled, placeholder },
    _ref,
  ) {
    return React.createElement('input', {
      placeholder,
      value,
      disabled,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onEnterKey) {
          e.preventDefault()
          onEnterKey()
        }
      },
    })
  })
  return { MixedMathInput }
})

import { ChatFreeResponseBubble } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/bubbles/ChatFreeResponseBubble'
import { I18nProvider } from '@/ui/web/providers/I18n'
import type { QuestionFreeResponseBlock } from '@/ui/web/exerciserenderer/types'
import { readExerciseState } from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'

function richText(value: string) {
  return { type: 'rich_text' as const, format: 'md-math-v1' as const, value, mediaIds: [] }
}

function makeBlock(opts?: { solution?: boolean }): QuestionFreeResponseBlock {
  return {
    id: 'q-free',
    type: 'question_free_response',
    prompt: richText('What is 2+2?'),
    answer: { acceptedAnswers: ['4'] },
    solution: opts?.solution ? richText('Add two and two.') : undefined,
  } as QuestionFreeResponseBlock
}

const validationErrorMessages = {
  invalidAnswerType: 'invalidAnswerType',
  selectTrueFalse: 'selectTrueFalse',
  noCorrectAnswer: 'noCorrectAnswer',
  selectAnAnswer: 'selectAnAnswer',
  enterAnAnswer: 'enterAnAnswer',
  unknownVariant: 'unknownVariant',
  validationFailed: 'validationFailed',
  validationError: 'validationError',
  connectionError: 'connectionError',
}

const minimalI18nMessages = {
  // Load a minimal messages dict so useTranslations('courses') doesn't throw.
  courses: {
    insertFormula: 'ƒ',
  },
}

// Minimal I18nProvider wrapper. The real provider resolves `useTranslations('courses')`
// against the `courses` namespace in `messages`, so we only need to populate the keys
// the component touches directly (just the `insertFormula` aria-label today).
function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" messages={minimalI18nMessages}>
      {ui}
    </I18nProvider>
  )
}

describe('ChatFreeResponseBubble — Task 4 open-answer check', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
    window.localStorage.clear()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('local approved-answer match passes instantly without hitting the server', async () => {
    const onSubmit = vi.fn()
    render(
      wrap(
        <ChatFreeResponseBubble
          block={makeBlock()}
          placeholder="Type here"
          sendLabel="Send"
          onSubmit={onSubmit}
          validationErrorMessages={validationErrorMessages}
          pendingLabel="Checking…"
          notCheckedLabel="Not checked"
        />,
      ),
    )

    const input = screen.getByPlaceholderText('Type here') as HTMLInputElement
    fireEvent.change(input, { target: { value: '4' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('q-free', '4', true))
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(screen.queryByText('Checking…')).toBeNull()
  })

  it('local miss falls through to server AI; a correct AI verdict flows to onSubmit', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { isCorrect: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const onSubmit = vi.fn()
    render(
      wrap(
        <ChatFreeResponseBubble
          block={makeBlock()}
          placeholder="Type here"
          sendLabel="Send"
          onSubmit={onSubmit}
          validationErrorMessages={validationErrorMessages}
          pendingLabel="Checking…"
          notCheckedLabel="Not checked"
        />,
      ),
    )

    const input = screen.getByPlaceholderText('Type here') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'four' } })
    fireEvent.submit(input.closest('form')!)

    // Pending indicator surfaces while the server call is in flight.
    expect(screen.getByText('Checking…')).not.toBeNull()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('q-free', 'four', true))
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('quota exhausted skips the server and shows the self-compare solution', async () => {
    const onSubmit = vi.fn()
    render(
      wrap(
        <ChatFreeResponseBubble
          block={makeBlock({ solution: true })}
          placeholder="Type here"
          sendLabel="Send"
          onSubmit={onSubmit}
          isQuotaExhausted
          validationErrorMessages={validationErrorMessages}
          pendingLabel="Checking…"
          notCheckedLabel="Not checked"
        />,
      ),
    )

    const input = screen.getByPlaceholderText('Type here') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'something off-match' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith('q-free', 'something off-match', false),
    )
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(screen.getByText('Not checked')).not.toBeNull()
    expect(screen.getByText('Add two and two.')).not.toBeNull()
  })

  it('records every submission in blockMeta.submissions for later review', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { isCorrect: false } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const onSubmit = vi.fn()
    const exerciseId = 'ex-1'
    render(
      wrap(
        <ChatFreeResponseBubble
          block={makeBlock()}
          exerciseId={exerciseId}
          placeholder="Type here"
          sendLabel="Send"
          onSubmit={onSubmit}
          validationErrorMessages={validationErrorMessages}
          pendingLabel="Checking…"
          notCheckedLabel="Not checked"
        />,
      ),
    )

    const input = screen.getByPlaceholderText('Type here') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'not quite' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('q-free', 'not quite', false))

    const saved = readExerciseState(exerciseId)
    const subs = saved?.blockMeta?.['q-free']?.submissions ?? []
    expect(subs).toHaveLength(1)
    expect(subs[0]!.text).toBe('not quite')
    expect(subs[0]!.isCorrect).toBe(false)
    expect(subs[0]!.notChecked).toBe(false)
  })

  it('records a quota-exhausted attempt as notChecked=true', async () => {
    const onSubmit = vi.fn()
    const exerciseId = 'ex-2'
    render(
      wrap(
        <ChatFreeResponseBubble
          block={makeBlock({ solution: true })}
          exerciseId={exerciseId}
          placeholder="Type here"
          sendLabel="Send"
          onSubmit={onSubmit}
          isQuotaExhausted
          validationErrorMessages={validationErrorMessages}
          pendingLabel="Checking…"
          notCheckedLabel="Not checked"
        />,
      ),
    )

    const input = screen.getByPlaceholderText('Type here') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'answer without AI check' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())

    const saved = readExerciseState(exerciseId)
    expect(saved?.blockMeta?.['q-free']?.notChecked).toBe(true)
    expect(saved?.blockMeta?.['q-free']?.submissions?.[0]?.notChecked).toBe(true)
  })
})

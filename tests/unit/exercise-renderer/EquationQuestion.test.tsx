// @vitest-environment jsdom
import React, { useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { QuestionEquationBlock } from '@/infra/types/exercise'
import type { UserAnswer } from '@/ui/web/exerciserenderer/types'
import { EquationQuestion } from '@/ui/web/exerciserenderer/questions/EquationQuestion'

const block: QuestionEquationBlock = {
  id: 'q1',
  type: 'question_equation',
  prompt: { type: 'rich_text', format: 'md-math-v1', value: '', mediaIds: [] },
  equation: { left: '2x + 3', right: 'x + 8' },
  steps: [
    {
      id: 's1',
      options: [
        { id: 'o1', label: 'a' },
        { id: 'o2', label: 'b' },
      ],
      correctOptionId: 'o2',
      result: { left: 'x + 3', right: '8' },
    },
    {
      id: 's2',
      options: [
        { id: 'o1', label: 'c' },
        { id: 'o2', label: 'd' },
      ],
      correctOptionId: 'o1',
      result: { left: 'x', right: '5' },
    },
  ],
}

function Harness({ onWrongChoice }: { onWrongChoice: () => void }) {
  const [answer, setAnswer] = useState<UserAnswer>({ type: 'equation', completedSteps: 0 })
  return (
    <EquationQuestion
      question={block}
      answer={answer}
      onChange={setAnswer}
      onWrongChoice={onWrongChoice}
      t={(key) => key}
    />
  )
}

function Fixed({ completedSteps, disabled }: { completedSteps: number; disabled?: boolean }) {
  return (
    <EquationQuestion
      question={block}
      answer={{ type: 'equation', completedSteps }}
      onChange={vi.fn()}
      disabled={disabled}
      t={(key) => key}
    />
  )
}

const option = (label: string) => screen.getByRole('button', { name: new RegExp(label) })

afterEach(cleanup)

describe('EquationQuestion', () => {
  it('stays on the step after a wrong pick and reports it', () => {
    const onWrongChoice = vi.fn()
    render(<Harness onWrongChoice={onWrongChoice} />)

    fireEvent.click(option('a'))

    expect(screen.getByText('equationTryAgain')).toBeTruthy()
    expect(onWrongChoice).toHaveBeenCalledTimes(1)
    expect(option('b')).toBeTruthy()
  })

  it('walks each correct option through to the solved state', () => {
    const onWrongChoice = vi.fn()
    render(<Harness onWrongChoice={onWrongChoice} />)

    fireEvent.click(option('b'))
    fireEvent.click(option('c'))

    expect(screen.getByText('equationSolved')).toBeTruthy()
    expect(screen.queryByText('equationPrompt')).toBeNull()
    expect(onWrongChoice).not.toHaveBeenCalled()
  })

  it('starts over from the reset button', () => {
    render(<Harness onWrongChoice={vi.fn()} />)

    fireEvent.click(option('b'))
    fireEvent.click(screen.getByRole('button', { name: 'equationReset' }))

    expect(option('a')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'equationReset' })).toBeNull()
  })

  it('clamps a stale saved answer to the solved state', () => {
    render(<Fixed completedSteps={9} />)

    expect(screen.getByText('equationSolved')).toBeTruthy()
  })

  it('hides a blank prompt', () => {
    const { container } = render(<Fixed completedSteps={0} />)

    expect(container.querySelector('.prose')).toBeNull()
  })

  it('tones the math itself, since .katex sets its own color', () => {
    const { container } = render(<Fixed completedSteps={2} />)

    expect(container.querySelectorAll('[class*="[&_.katex]:text-destructive"]')).toHaveLength(4)
    // Both sides of the final line, plus its `=`
    expect(container.querySelectorAll('[class*="[&_.katex]:text-success"]')).toHaveLength(3)
  })

  it('keeps the shared text size on toned lines', () => {
    const { container } = render(<Fixed completedSteps={2} />)

    const lines = container.querySelectorAll('[dir="ltr"].grid')
    lines.forEach((line) => expect(line.className).toContain('text-heading-lg'))
  })

  it('cannot start over once disabled', () => {
    render(<Fixed completedSteps={2} disabled />)

    expect(screen.queryByRole('button', { name: 'equationReset' })).toBeNull()
  })
})

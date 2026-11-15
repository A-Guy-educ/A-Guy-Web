// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { QuestionEquationBlock } from '@/infra/types/exercise'
import type { EquationOperation } from '@/infra/types/linearEquation'
import type { UserAnswer } from '@/ui/web/exerciserenderer/types'
import { EquationQuestion } from '@/ui/web/exerciserenderer/questions/EquationQuestion'

const block: QuestionEquationBlock = {
  id: 'q1',
  type: 'question_equation',
  mode: 'dynamic',
  prompt: { type: 'rich_text', format: 'md-math-v1', value: '', mediaIds: [] },
  equation: { left: '2x + 3', right: 'x + 8' },
  steps: [],
  linear: { a: 2, b: 3, c: 1, d: 8 },
}

const minusX: EquationOperation = { kind: 'add_x', value: { n: -1, d: 1 } }
const minus3: EquationOperation = { kind: 'add_number', value: { n: -3, d: 1 } }
const plus4: EquationOperation = { kind: 'add_number', value: { n: 4, d: 1 } }

function renderWith(answer: UserAnswer, disabled = false) {
  return render(
    <EquationQuestion
      question={block}
      answer={answer}
      onChange={vi.fn()}
      disabled={disabled}
      t={(key) => key}
    />,
  )
}

const played = (operations: EquationOperation[]): UserAnswer => ({
  type: 'equation',
  completedSteps: operations.length,
  operations,
})

const optionButtons = () =>
  screen.queryAllByRole('button').filter((b) => b.textContent !== 'equationReset')

afterEach(cleanup)

describe('DynamicEquationQuestion', () => {
  it('offers three options and no reset before any move', () => {
    renderWith(played([]))

    expect(optionButtons()).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'equationReset' })).toBeNull()
  })

  it('notes a detour and keeps playing', () => {
    renderWith(played([plus4]))

    expect(screen.getByText('equationNoteNumber')).toBeTruthy()
    expect(optionButtons()).toHaveLength(3)
  })

  it('shows the solved panel with the substitution check', () => {
    renderWith(played([minusX, minus3]))

    expect(screen.getByText('equationSolved')).toBeTruthy()
    expect(screen.getByText('equationCheckHolds')).toBeTruthy()
    expect(optionButtons()).toHaveLength(0)
  })

  it('keeps the played lines and solved panel but no controls when disabled', () => {
    const { container } = renderWith(played([minusX, minus3]), true)

    expect(screen.getByText('equationSolved')).toBeTruthy()
    expect(container.querySelectorAll('[class*="bg-success/10"]')).toHaveLength(2)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('starts from the original equation when a saved answer has no operations', () => {
    renderWith({ type: 'equation', completedSteps: 2 })

    expect(screen.queryByText('equationSolved')).toBeNull()
    expect(optionButtons()).toHaveLength(3)
  })
})

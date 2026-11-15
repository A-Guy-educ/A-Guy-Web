// @vitest-environment jsdom
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProofQuestion } from '@/ui/web/exerciserenderer/questions/ProofQuestion'
import { formatExerciseContextMessage } from '@/infra/llm/exercise-context'
import { proofCommonSideAbcAdc, proofSasKlmXyz } from './fixtures/questionProofDemo'

const LABELS: Record<string, string> = {
  proofGiven: 'נתון',
  proofChooseReason: 'בחרו נימוק',
  proofChooseClaim: 'בחרו טענה',
  checkAnswer: 'בדיקת תשובה',
  tryAgain: 'נסה שוב',
  correct: 'נכון!',
}
const t = (key: string) => LABELS[key] ?? key

function renderProof(attachment?: React.ReactNode) {
  return render(
    <ProofQuestion
      question={proofSasKlmXyz}
      answer={{ type: 'table', cellValues: {} }}
      onChange={vi.fn()}
      checked={false}
      allCorrect={false}
      onCheckResult={vi.fn()}
      t={t}
      attachment={attachment}
    />,
  )
}

describe('ProofQuestion', () => {
  it('renders the fixed headers, the given box, and a reason dropdown for the blank', () => {
    renderProof()
    expect(screen.getByRole('columnheader', { name: 'טענה' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'נימוק' })).toBeTruthy()
    expect(screen.getByText('נתון', { selector: 'div' })).toBeTruthy()
    const dropdowns = screen.getAllByRole('combobox')
    expect(dropdowns).toHaveLength(1)
    expect(dropdowns[0].textContent).toContain('בחרו נימוק')
    expect(screen.getByRole('button', { name: 'בדיקת תשובה' })).toBeTruthy()
  })

  it('stacks prompt, given, diagram, table, actions in DOM order', () => {
    const { container } = renderProof(<svg data-testid="diagram" />)
    const given = screen.getByText('נתון', { selector: 'div' })
    const diagram = screen.getByTestId('diagram')
    const table = container.querySelector('table')!
    const check = screen.getByRole('button', { name: 'בדיקת תשובה' })
    const follows = (a: Node, b: Node) =>
      !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(follows(given, diagram)).toBe(true)
    expect(follows(diagram, table)).toBe(true)
    expect(follows(table, check)).toBe(true)
  })
})

describe('ProofQuestion dropdown', () => {
  // Radix Select calls these DOM APIs that jsdom doesn't implement.
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}

  it('opens its options above full-screen page layers (exercise workspace is z-[200])', () => {
    renderProof()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })

    const listbox = screen.getByRole('listbox')
    expect(screen.getAllByRole('option')).toHaveLength(3)
    const layer = listbox.closest('.z-popover')
    expect(layer).toBeTruthy()
    expect(layer!.className).not.toMatch(/\bz-50\b/)
  })
})

describe('question_proof LLM exercise context', () => {
  it('lists every row and the blank options without marking the answer', () => {
    const text = formatExerciseContextMessage('חפיפת משולשים', [
      proofCommonSideAbcAdc as unknown as { id: string; type: string },
    ])
    expect(text).toContain('[Question: Proof')
    expect(text).toContain('1) $AB = AD$ — נתון')
    expect(text).toContain('3) $AC = AC$ — [blank: נתון / צלע משותפת / זוויות קודקודיות]')
    expect(text).not.toMatch(/answer|correct/i)
  })
})

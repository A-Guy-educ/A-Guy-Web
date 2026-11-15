// @vitest-environment jsdom
/**
 * A dynamic equation block through the full ExerciseRenderer: a detour gets a
 * note and a 'wrong' attempt, isolating x grades the question correct, and the
 * chosen operations survive a remount (the saved exercise state).
 */
import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import enMessages from '../../../src/i18n/en.json'
import { I18nProvider } from '@/ui/web/providers/I18n'
import { ExerciseRenderer } from '@/ui/web/exerciserenderer/ExerciseRenderer'
import type { ExerciseBlockGroup, QuestionEquationBlock } from '@/infra/types/exercise'
import {
  applyOperations,
  generateOptions,
  getUnhelpfulReason,
  isHelpful,
  operationLatex,
  type EquationOperation,
} from '@/infra/types/linearEquation'

const linear = { a: 2, b: 3, c: 1, d: 8 }
const block: QuestionEquationBlock = {
  id: 'eq-1',
  type: 'question_equation',
  mode: 'dynamic',
  prompt: { type: 'rich_text', format: 'md-math-v1', value: '', mediaIds: [] },
  equation: { left: '2x + 3', right: 'x + 8' },
  steps: [],
  linear,
}
const groups: ExerciseBlockGroup[] = [
  { sectionIndex: null, blocks: [block] as ExerciseBlockGroup['blocks'] },
]
const courses = enMessages.courses as Record<string, string>
const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')))

function renderExercise() {
  return render(
    <I18nProvider locale="en" messages={enMessages}>
      <ExerciseRenderer groups={groups} lessonId="lesson-1" exerciseId="ex-1" />
    </I18nProvider>,
  )
}

/** The options the student sees after `played`, as the component seeds them. */
function optionsAfter(played: EquationOperation[]): EquationOperation[] {
  return generateOptions(applyOperations(linear, played), `${block.id}:0:${played.length}`)
}

function click(operation: EquationOperation) {
  const latex = operationLatex(operation)
  const button = [...document.querySelectorAll('button')].find(
    (b) => b.querySelector('annotation')?.textContent === latex,
  )
  if (!button) throw new Error(`No option button for ${latex}`)
  fireEvent.click(button)
}

function wrongReports() {
  return fetchMock.mock.calls.filter(([, init]) =>
    String((init as RequestInit | undefined)?.body).includes('"event":"wrong"'),
  ).length
}

beforeEach(() => {
  localStorage.clear()
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('dynamic equation in ExerciseRenderer', () => {
  it('solves with one detour, grades correct, and restores after a reload', async () => {
    const { unmount } = renderExercise()
    const played: EquationOperation[] = []
    const state = () => applyOperations(linear, played)

    const detour = optionsAfter(played).find((op) => !isHelpful(state(), op))!
    const reason = getUnhelpfulReason(state(), detour)
    click(detour)
    played.push(detour)

    const noteKey = {
      variable: 'equationNoteVariable',
      number: 'equationNoteNumber',
      divide: 'equationNoteDivide',
      clear: 'equationNoteClear',
    }[reason]
    expect(screen.getByText(courses[noteKey])).toBeInTheDocument()
    expect(wrongReports()).toBe(1)

    for (let turn = 0; turn < 6 && !screen.queryByText(courses.equationSolved); turn++) {
      const helpful = optionsAfter(played).find((op) => isHelpful(state(), op))!
      click(helpful)
      played.push(helpful)
    }

    expect(screen.getByText(courses.equationSolved)).toBeInTheDocument()
    expect(screen.getByText(courses.equationCheckTitle)).toBeInTheDocument()
    expect(screen.getByText(courses.equationCheckHolds)).toBeInTheDocument()
    expect(screen.queryByText(courses[noteKey])).not.toBeInTheDocument()
    expect(document.querySelectorAll('[class*="bg-success/10"]').length).toBe(played.length - 1)
    expect((await screen.findAllByText(courses.correct)).length).toBeGreaterThan(0)
    expect(wrongReports()).toBe(1)

    unmount()
    renderExercise()

    expect(screen.getByText(courses.equationSolved)).toBeInTheDocument()
    expect(document.querySelectorAll('[class*="bg-success/10"]').length).toBe(played.length - 1)
  })
})

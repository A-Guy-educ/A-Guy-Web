// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { LandingDemoExercise } from '@/ui/web/homepage/PrivateLessonLanding/LandingDemoExercise'
import { I18nProvider } from '@/ui/web/providers/I18n'

import heMessages from '../../../src/i18n/he.json'

const rt = (value: string) => ({
  type: 'rich_text' as const,
  format: 'md-math-v1' as const,
  value,
  mediaIds: [],
})

function groups(options: string[], help: { hint?: string; fullSolution?: string }) {
  return [
    {
      sectionIndex: null,
      blocks: [
        { id: 'stem', ...rt('נתון המספר 0.4') },
        {
          id: 'q',
          type: 'question_select',
          variant: 'mcq',
          selectionMode: 'single',
          prompt: rt('איפה הספרה 4?'),
          answer: {
            multiSelect: false,
            options: options.map((o, i) => ({ id: `o${i}`, content: rt(o) })),
            correctOptionIds: ['o0'],
          },
          ...(help.hint ? { hint: rt(help.hint) } : {}),
          ...(help.fullSolution ? { fullSolution: rt(help.fullSolution) } : {}),
        },
      ],
    },
  ] as unknown as ExerciseBlockGroup[]
}

const renderDemo = (g: ExerciseBlockGroup[]) =>
  render(
    <I18nProvider locale="he" messages={heMessages}>
      <LandingDemoExercise groups={g} />
    </I18nProvider>,
  )

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('LandingDemoExercise (chat view)', () => {
  it('shows the given data, the question and the hint / explanation chips', () => {
    renderDemo(groups(['עשיריות', 'יחידות'], { hint: 'רמז כתוב', fullSolution: 'הסבר כתוב' }))
    expect(screen.getByText('נתון המספר 0.4')).toBeTruthy()
    expect(screen.getByText('איפה הספרה 4?')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'דלג' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'רמז' }))
    expect(screen.getByText('רמז כתוב')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'רמז' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'הסבר' }))
    expect(screen.getByText('הסבר כתוב')).toBeTruthy()
  })

  it('answers a wrong pick with the written explanation', () => {
    renderDemo(groups(['עשיריות', 'יחידות'], { hint: 'רמז כתוב', fullSolution: 'הסבר כתוב' }))
    fireEvent.click(screen.getByRole('button', { name: /יחידות/ }))
    expect(screen.getByText('הסבר ותיקון')).toBeTruthy()
    expect(screen.getByText('הסבר כתוב')).toBeTruthy()
    // Chips go once the question is answered, as in the lesson.
    expect(screen.queryByRole('button', { name: 'רמז' })).toBeNull()
  })

  it('offers the written hint after a first wrong pick on a three-option question', () => {
    renderDemo(groups(['עשיריות', 'יחידות', 'מאיות'], { hint: 'רמז כתוב' }))
    fireEvent.click(screen.getByRole('button', { name: /מאיות/ }))
    fireEvent.click(screen.getByRole('button', { name: 'תן לי רמז' }))
    expect(screen.getByText('רמז כתוב')).toBeTruthy()
  })

  it('cheers a correct pick', () => {
    renderDemo(groups(['עשיריות', 'יחידות'], { hint: 'רמז כתוב' }))
    fireEvent.click(screen.getByRole('button', { name: /עשיריות/ }))
    expect(screen.queryByText('הסבר ותיקון')).toBeNull()
    expect(screen.getAllByText(/!/).length).toBeGreaterThan(0)
  })
})

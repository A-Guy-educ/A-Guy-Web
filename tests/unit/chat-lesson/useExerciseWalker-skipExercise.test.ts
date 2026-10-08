// @vitest-environment jsdom
import { useExerciseWalker } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/useExerciseWalker'
import type { StreamEntry } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/types'
import type { Exercise } from '@/infra/types/content'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

type QuestionBlock = {
  id: string
  type: 'question_select'
  variant?: 'true_false'
  question: unknown
  options: Array<{ id: string; label: string }>
  answer: { correctOptionId: string }
}

function qBlock(id: string): QuestionBlock {
  return {
    id,
    type: 'question_select',
    variant: 'true_false',
    question: { blocks: [] },
    options: [
      { id: `${id}-a`, label: 'A' },
      { id: `${id}-b`, label: 'B' },
    ],
    answer: { correctOptionId: `${id}-a` },
  }
}

function makeExercise(id: string, title: string, sectionCount: number): Exercise {
  const sections = Array.from({ length: sectionCount }, (_, idx) => ({
    id: `${id}-s${idx}`,
    title: `${title} סעיף ${idx + 1}`,
    content: { blocks: [qBlock(`${id}-s${idx}-q`)] },
    order: idx,
  }))
  return {
    id,
    title,
    slug: id,
    sections,
    content: { blocks: [] },
  } as unknown as Exercise
}

/**
 * The walker emits via `append`. For these tests we just want to know which
 * steps are reached — captured by looking at keys of `exercise-section`
 * entries + the terminator kind.
 */
function trackEmissions() {
  const entries: StreamEntry[] = []
  return {
    entries,
    append: (e: StreamEntry) => entries.push(e),
    sectionKeys: () => entries.filter((e) => e.kind === 'exercise-section').map((e) => e.key),
    terminalKind: () => {
      const last = entries[entries.length - 1]
      if (!last) return null
      if (last.kind === 'lesson-complete' || last.kind === 'tier-lock') return last.kind
      return null
    },
  }
}

describe('useExerciseWalker.advanceToNextExercise', () => {
  it('jumps from mid-exercise to the first section of the next exercise', () => {
    const exercises = [makeExercise('ex1', 'תרגיל 1', 3), makeExercise('ex2', 'תרגיל 2', 2)]
    const { entries, append, sectionKeys } = trackEmissions()
    const { result } = renderHook(() => useExerciseWalker({ exercises, append, isHebrew: true }))

    // Seed renders ex1 section 0.
    expect(sectionKeys()).toEqual(['sec-ex1-0'])

    // Advance once → ex1 section 1 (still in ex1).
    act(() => {
      result.current.advance()
    })
    expect(sectionKeys()).toEqual(['sec-ex1-0', 'sec-ex1-1'])

    // Skip the rest of ex1 → should jump straight to ex2 section 0.
    act(() => {
      result.current.advanceToNextExercise()
    })
    expect(sectionKeys()).toEqual(['sec-ex1-0', 'sec-ex1-1', 'sec-ex2-0'])
    // No terminator yet.
    const hasTerminator = entries.some(
      (e) => e.kind === 'lesson-complete' || e.kind === 'tier-lock',
    )
    expect(hasTerminator).toBe(false)
    expect(result.current.currentExerciseOrdinal).toBe(2)
  })

  it('terminates with lesson-complete when skipping past the last exercise', () => {
    const exercises = [makeExercise('ex1', 'תרגיל 1', 2)]
    const { append, terminalKind } = trackEmissions()
    const { result } = renderHook(() => useExerciseWalker({ exercises, append, isHebrew: true }))

    act(() => {
      result.current.advanceToNextExercise()
    })

    expect(terminalKind()).toBe('lesson-complete')
    expect(result.current.isComplete).toBe(true)
  })

  it('is a no-op once the lesson is complete', () => {
    const exercises = [makeExercise('ex1', 'תרגיל 1', 1)]
    const { append, entries } = trackEmissions()
    const { result } = renderHook(() => useExerciseWalker({ exercises, append, isHebrew: true }))

    act(() => {
      result.current.advance() // triggers terminator
    })
    const after = entries.length
    act(() => {
      result.current.advanceToNextExercise()
    })
    // No new entries appended after the walker is complete.
    expect(entries.length).toBe(after)
  })
})

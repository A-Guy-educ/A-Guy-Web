// @vitest-environment jsdom
import { useExerciseWalker } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/useExerciseWalker'
import type { StreamEntry } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/types'
import type { Exercise } from '@/infra/types/content'
import { writeExerciseState } from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

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

function trackEmissions() {
  const entries: StreamEntry[] = []
  return {
    entries,
    append: (e: StreamEntry) => entries.push(e),
    kinds: () => entries.map((e) => e.kind),
    keys: () => entries.map((e) => e.key),
  }
}

function markBlockWrong(exerciseId: string, blockId: string) {
  writeExerciseState(exerciseId, {
    answers: { [blockId]: { type: 'mcq', selectedIds: [`${blockId}-b`] } },
    checkResults: { [blockId]: { isCorrect: false } },
    hasChecked: { [blockId]: true },
    svgAnswers: {},
    svgCheckResults: {},
    blockMeta: {},
  })
}

describe('useExerciseWalker — Task 5 review mode', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('end-of-lesson advance emits review-offer when at least one section is eligible', () => {
    const exercises = [makeExercise('ex1', 'תרגיל 1', 2)]
    // Mark the second section wrong so it qualifies for review.
    markBlockWrong('ex1', 'ex1-s1-q')

    const track = trackEmissions()
    const { result } = renderHook(() =>
      useExerciseWalker({ exercises, append: track.append, isHebrew: true }),
    )

    // Advance through both sections, then the final advance should emit the
    // review offer instead of the lesson-complete terminator.
    act(() => {
      result.current.advance()
    })
    act(() => {
      result.current.advance()
    })
    expect(track.kinds()).toContain('review-offer')
    expect(track.kinds()).not.toContain('lesson-complete')
    expect(result.current.isComplete).toBe(false)
  })

  it('no eligible sections → final advance fires lesson-complete as before', () => {
    const exercises = [makeExercise('ex1', 'תרגיל 1', 1)]
    // No block state written → nothing eligible.
    const track = trackEmissions()
    const { result } = renderHook(() =>
      useExerciseWalker({ exercises, append: track.append, isHebrew: true }),
    )

    act(() => {
      result.current.advance()
    })

    expect(track.kinds()).toContain('lesson-complete')
    expect(track.kinds()).not.toContain('review-offer')
    expect(result.current.isComplete).toBe(true)
  })

  it('startReview emits only eligible sections with review- key prefix + storageIdOverride', () => {
    const exercises = [makeExercise('ex1', 'תרגיל 1', 2), makeExercise('ex2', 'תרגיל 2', 1)]
    // Only ex1 section 1 and ex2 section 0 are eligible.
    markBlockWrong('ex1', 'ex1-s1-q')
    markBlockWrong('ex2', 'ex2-s0-q')

    const track = trackEmissions()
    const { result } = renderHook(() =>
      useExerciseWalker({ exercises, append: track.append, isHebrew: true }),
    )

    // Walk to the end to trigger the review-offer.
    act(() => {
      result.current.advance()
    })
    act(() => {
      result.current.advance()
    })
    act(() => {
      result.current.advance()
    })
    expect(track.kinds()).toContain('review-offer')

    // Tap "yes" — walker enters review mode and emits the first eligible step.
    act(() => {
      result.current.startReview()
    })
    expect(result.current.isReviewing).toBe(true)
    const reviewSectionEntries = track.entries.filter(
      (e) => e.kind === 'exercise-section' && e.key.startsWith('review-sec-'),
    )
    expect(reviewSectionEntries).toHaveLength(1)
    const [firstReview] = reviewSectionEntries
    expect(firstReview!.key).toBe('review-sec-ex1-1')
    expect(
      (firstReview as Extract<StreamEntry, { kind: 'exercise-section' }>).storageIdOverride,
    ).toBe('review-ex1')
    // currentStepKey matches the emitted key so the runner's isActive gate is correct.
    expect(result.current.currentStepKey).toBe('review-sec-ex1-1')

    // Advance through the review slice — next step is ex2's eligible section.
    act(() => {
      result.current.advance()
    })
    const latest = track.entries[track.entries.length - 1]!
    expect(latest.kind).toBe('exercise-section')
    expect((latest as Extract<StreamEntry, { kind: 'exercise-section' }>).key).toBe(
      'review-sec-ex2-0',
    )

    // One more advance ends the review and fires the terminator.
    act(() => {
      result.current.advance()
    })
    expect(track.kinds()[track.kinds().length - 1]).toBe('lesson-complete')
    expect(result.current.isComplete).toBe(true)
  })

  it('startReview works AFTER lesson-complete (summary card redo path)', () => {
    // The summary card is rendered AFTER the walker fires lesson-complete,
    // so by the time its "לחזור ל-N" button is tapped `isComplete` is true.
    // Earlier startReview guarded on `isComplete` and silently returned,
    // leaving the student clicking a dead button. Fix: startReview now
    // flips isComplete back to false and emits the first review step.
    const exercises = [makeExercise('ex1', 'תרגיל 1', 2)]
    markBlockWrong('ex1', 'ex1-s0-q')

    const track = trackEmissions()
    const { result } = renderHook(() =>
      useExerciseWalker({ exercises, append: track.append, isHebrew: true }),
    )

    // Walk to lesson-complete via the review-offer + completeLesson path.
    act(() => {
      result.current.advance()
    })
    act(() => {
      result.current.advance()
    })
    act(() => {
      result.current.completeLesson()
    })
    expect(result.current.isComplete).toBe(true)
    expect(track.kinds()).toContain('lesson-complete')

    // Student taps the summary card's redo button → walker should re-enter
    // review mode and emit the eligible section's review bubble.
    act(() => {
      result.current.startReview()
    })
    expect(result.current.isReviewing).toBe(true)
    expect(result.current.isComplete).toBe(false)
    const reviewSectionEntries = track.entries.filter(
      (e) => e.kind === 'exercise-section' && e.key.startsWith('review-sec-'),
    )
    expect(reviewSectionEntries).toHaveLength(1)
    expect(reviewSectionEntries[0]!.key).toBe('review-sec-ex1-0')
  })

  it('advanceToNextExercise on the LAST exercise also checks review eligibility', () => {
    // Earlier the "skip exercise" chip on the final exercise bypassed the
    // review check and fired lesson-complete immediately, so a student who
    // missed stuff earlier never saw the offer. Fix: the terminal branch
    // of advanceToNextExercise mirrors advance()'s eligibility check.
    const exercises = [makeExercise('ex1', 'תרגיל 1', 2)]
    markBlockWrong('ex1', 'ex1-s0-q')

    const track = trackEmissions()
    const { result } = renderHook(() =>
      useExerciseWalker({ exercises, append: track.append, isHebrew: true }),
    )

    // Student is on the first (and only) exercise. Skipping it jumps to the
    // terminal case — but the earlier wrong answer must still trip the
    // review offer.
    act(() => {
      result.current.advanceToNextExercise()
    })

    expect(track.kinds()).toContain('review-offer')
    expect(track.kinds()).toContain('skipped-marker')
    expect(track.kinds()).not.toContain('lesson-complete')
    expect(result.current.isComplete).toBe(false)
  })

  it('completeLesson from the review offer fires the terminator and skips review', () => {
    const exercises = [makeExercise('ex1', 'תרגיל 1', 1)]
    markBlockWrong('ex1', 'ex1-s0-q')

    const track = trackEmissions()
    const { result } = renderHook(() =>
      useExerciseWalker({ exercises, append: track.append, isHebrew: true }),
    )

    act(() => {
      result.current.advance()
    })
    expect(track.kinds()).toContain('review-offer')

    act(() => {
      result.current.completeLesson()
    })
    expect(track.kinds()).toContain('lesson-complete')
    expect(result.current.isComplete).toBe(true)
  })
})

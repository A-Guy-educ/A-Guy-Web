// @vitest-environment jsdom

/**
 * @fileType test
 * @domain frontend
 * @pattern lesson-navigation, exercise-pager, jump-to-exercise
 * @ai-summary Unit tests for the jump-to-exercise feature in useExercisesPager
 */
import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useExercisesPager } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ExercisesPager/useExercisesPager'
import type { Exercise } from '@/infra/types/content'
import type { ResolvedLessonBlock } from '@/server/repos/queries/lesson-blocks'

const createMockExercises = (count: number): Exercise[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `ex-${i + 1}`,
    slug: `ex-${i + 1}`,
    title: `Exercise ${i + 1}`,
    content: { blocks: [] },
  }))

const createMockBlocks = (
  contentPageCount: number,
  exerciseCount: number,
): ResolvedLessonBlock[] => {
  const contentPages: ResolvedLessonBlock[] = Array.from({ length: contentPageCount }, (_, i) => ({
    type: 'contentPage' as const,
    data: {
      id: `cp-${i + 1}`,
      slug: `cp-${i + 1}`,
      title: `Content Page ${i + 1}`,
    },
  }))
  const exercises: ResolvedLessonBlock[] = Array.from({ length: exerciseCount }, (_, i) => ({
    type: 'exercise' as const,
    data: {
      id: `ex-${i + 1}`,
      slug: `ex-${i + 1}`,
      title: `Exercise ${i + 1}`,
      content: { blocks: [] },
    },
  }))
  return [...contentPages, ...exercises]
}

const defaultParams = {
  courseSlug: 'test-course',
  chapterSlug: 'test-chapter',
  lessonSlug: 'test-lesson',
  lessonId: 'lesson-1',
  gradeLevel: 'Test Grade',
}

describe('useExercisesPager handleJumpToExercise', () => {
  beforeEach(() => {
    // Ensure clean URL state before each test
    vi.stubGlobal('window', {
      ...window,
      history: { ...window.history, replaceState: vi.fn() },
      location: {
        ...window.location,
        pathname: '/courses/test-course/chapters/test-chapter/lessons/test-lesson',
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── Reorder: content pages before exercises ─────────────────────────────────

  describe('block reordering (content pages before exercises)', () => {
    it('totalBlocks is sum of content pages and exercises', () => {
      const { result } = renderHook(() =>
        useExercisesPager({
          blocks: createMockBlocks(2, 3),
          ...defaultParams,
        }),
      )
      expect(result.current.totalBlocks).toBe(5)
      expect(result.current.totalContentPages).toBe(2)
      expect(result.current.totalExercises).toBe(3)
    })

    it('initial state lands on first block at page 0 (no intro offset)', () => {
      const { result } = renderHook(() =>
        useExercisesPager({
          blocks: createMockBlocks(2, 3),
          ...defaultParams,
        }),
      )
      // First block is a content page (content pages come before exercises)
      expect(result.current.pageState.type).toBe('contentPage')
      expect(result.current.pageState.pageNumber).toBe(0)
      expect(result.current.pageState.blockIndex).toBe(0)
      expect(result.current.canGoPrev).toBe(false)
      expect(result.current.canGoNext).toBe(true)
    })

    it('exercise ordinal counts only exercises, not content pages', () => {
      const { result } = renderHook(() =>
        useExercisesPager({
          blocks: createMockBlocks(2, 3),
          ...defaultParams,
        }),
      )
      // First block is a content page, not an exercise
      expect(result.current.getExerciseOrdinal()).toBeNull()
      expect(result.current.getContentPageOrdinal()).toBe(1)
    })

    it('jumping to exercise after reorder finds correct block index', () => {
      const { result } = renderHook(() =>
        useExercisesPager({
          blocks: createMockBlocks(2, 3),
          ...defaultParams,
        }),
      )
      // getExerciseOrdinal is null on content page
      expect(result.current.getExerciseOrdinal()).toBeNull()

      // Jump to exercise ordinal 1 (which is at block index 2 after 2 content pages)
      act(() => {
        result.current.handleJumpToExercise(1)
      })

      expect(result.current.getExerciseOrdinal()).toBe(1)
      // Exercise ordinal 1 is at block index 2 (after 2 content pages)
      expect(result.current.pageState.blockIndex).toBe(2)
      expect(result.current.pageState.type).toBe('exercise')
    })

    it('canGoPrev guards on pageNumber > 0', () => {
      const { result } = renderHook(() =>
        useExercisesPager({
          blocks: createMockBlocks(2, 3),
          ...defaultParams,
        }),
      )
      // On first block (page 0), cannot go prev
      expect(result.current.canGoPrev).toBe(false)

      // Navigate to next block
      act(() => {
        result.current.handleNext()
      })

      expect(result.current.canGoPrev).toBe(true)
    })

    it('outro state reached after all blocks', () => {
      const { result } = renderHook(() =>
        useExercisesPager({
          blocks: createMockBlocks(1, 1),
          ...defaultParams,
        }),
      )
      // Block 0: content page
      expect(result.current.pageState.type).toBe('contentPage')

      // Block 1: exercise
      act(() => {
        result.current.handleNext()
      })
      expect(result.current.pageState.type).toBe('exercise')

      // Block 2: outro
      act(() => {
        result.current.handleNext()
      })
      expect(result.current.pageState.type).toBe('outro')
      expect(result.current.canGoNext).toBe(false)
    })

    it('relative order preserved within content pages and exercises', () => {
      const blocks: ResolvedLessonBlock[] = [
        { type: 'contentPage', data: { id: 'cp-2', slug: 'cp-2', title: 'Page B' } },
        {
          type: 'exercise',
          data: { id: 'ex-2', slug: 'ex-2', title: 'Exercise B', content: { blocks: [] } },
        },
        { type: 'contentPage', data: { id: 'cp-1', slug: 'cp-1', title: 'Page A' } },
        {
          type: 'exercise',
          data: { id: 'ex-1', slug: 'ex-1', title: 'Exercise A', content: { blocks: [] } },
        },
      ]
      const { result } = renderHook(() =>
        useExercisesPager({
          blocks,
          ...defaultParams,
        }),
      )
      // After reordering: cp-2, cp-1, ex-2, ex-1 (relative order preserved within groups)
      expect(result.current.totalBlocks).toBe(4)
      expect(result.current.pageState.blockIndex).toBe(0)
      // First block (blockIndex 0) should be cp-2 (first content page in original order)
      expect(result.current.pageState.type).toBe('contentPage')
      expect(result.current.getContentPageOrdinal()).toBe(1)
    })
  })

  // ─── Original jump-to-exercise tests (skipIntro removed) ─────────────────────

  it('renders with correct initial state (3 exercises)', () => {
    const { result } = renderHook(() =>
      useExercisesPager({
        exercises: createMockExercises(3),
        ...defaultParams,
        initialExerciseIndex: 0,
      }),
    )

    expect(result.current.pageState.type).toBe('exercise')
    expect(result.current.pageState.blockIndex).toBe(0)
    expect(result.current.getExerciseOrdinal()).toBe(1)
    expect(result.current.totalExercises).toBe(3)
    expect(result.current.canGoPrev).toBe(false)
    expect(result.current.canGoNext).toBe(true)
  })

  it('jumps to a valid exercise number (3) and updates state', () => {
    const { result } = renderHook(() =>
      useExercisesPager({
        exercises: createMockExercises(3),
        ...defaultParams,
        initialExerciseIndex: 0,
      }),
    )

    expect(result.current.getExerciseOrdinal()).toBe(1)

    act(() => {
      result.current.handleJumpToExercise(3)
    })

    expect(result.current.getExerciseOrdinal()).toBe(3)
    expect(result.current.pageState.blockIndex).toBe(2)
  })

  it('jumps to middle exercise (2) and updates state correctly', () => {
    const { result } = renderHook(() =>
      useExercisesPager({
        exercises: createMockExercises(3),
        ...defaultParams,
        initialExerciseIndex: 0,
      }),
    )

    expect(result.current.getExerciseOrdinal()).toBe(1)

    act(() => {
      result.current.handleJumpToExercise(2)
    })

    expect(result.current.getExerciseOrdinal()).toBe(2)
    expect(result.current.pageState.blockIndex).toBe(1)
  })

  it('does not navigate when given out-of-range number greater than total', () => {
    const { result } = renderHook(() =>
      useExercisesPager({
        exercises: createMockExercises(3),
        ...defaultParams,
        initialExerciseIndex: 0,
      }),
    )

    expect(result.current.getExerciseOrdinal()).toBe(1)

    act(() => {
      result.current.handleJumpToExercise(10)
    })

    // State should not change
    expect(result.current.getExerciseOrdinal()).toBe(1)
    expect(result.current.pageState.blockIndex).toBe(0)
  })

  it('does not navigate when given out-of-range number less than 1', () => {
    const { result } = renderHook(() =>
      useExercisesPager({
        exercises: createMockExercises(3),
        ...defaultParams,
        initialExerciseIndex: 0,
      }),
    )

    expect(result.current.getExerciseOrdinal()).toBe(1)

    act(() => {
      result.current.handleJumpToExercise(0)
    })

    expect(result.current.getExerciseOrdinal()).toBe(1)
  })

  it('does not navigate when given negative number', () => {
    const { result } = renderHook(() =>
      useExercisesPager({
        exercises: createMockExercises(3),
        ...defaultParams,
        initialExerciseIndex: 0,
      }),
    )

    expect(result.current.getExerciseOrdinal()).toBe(1)

    act(() => {
      result.current.handleJumpToExercise(-1)
    })

    expect(result.current.getExerciseOrdinal()).toBe(1)
  })

  it('jumping to same exercise is a no-op', () => {
    const { result } = renderHook(() =>
      useExercisesPager({
        exercises: createMockExercises(3),
        ...defaultParams,
        initialExerciseIndex: 0,
      }),
    )

    expect(result.current.getExerciseOrdinal()).toBe(1)

    act(() => {
      result.current.handleJumpToExercise(1)
    })

    expect(result.current.getExerciseOrdinal()).toBe(1)
  })

  it('works with single exercise', () => {
    const { result } = renderHook(() =>
      useExercisesPager({
        exercises: createMockExercises(1),
        ...defaultParams,
        initialExerciseIndex: 0,
      }),
    )

    expect(result.current.getExerciseOrdinal()).toBe(1)

    act(() => {
      result.current.handleJumpToExercise(5)
    })

    // Should not navigate since only 1 exercise exists
    expect(result.current.getExerciseOrdinal()).toBe(1)
  })
})

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
  items: Array<
    | { type: 'contentPage'; id: string; title?: string; slug?: string }
    | { type: 'exercise'; id: string; title?: string; slug?: string }
  >,
): ResolvedLessonBlock[] =>
  items.map((item) => ({
    type: item.type,
    data:
      item.type === 'contentPage'
        ? {
            id: item.id,
            title: item.title ?? `Content ${item.id}`,
            slug: item.slug ?? `content-${item.id}`,
          }
        : {
            id: item.id,
            title: item.title ?? `Exercise ${item.id}`,
            slug: item.slug ?? `ex-${item.id}`,
            content: { blocks: [] },
          },
  }))

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

  it('renders with correct initial state (3 exercises only)', () => {
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

describe('useExercisesPager block reordering', () => {
  beforeEach(() => {
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

  it('places content pages before exercises when blocks are mixed', () => {
    const blocks = createMockBlocks([
      { type: 'exercise', id: 'ex-1', slug: 'ex-1' },
      { type: 'contentPage', id: 'cp-1', slug: 'cp-1' },
      { type: 'exercise', id: 'ex-2', slug: 'ex-2' },
    ])

    const { result } = renderHook(() =>
      useExercisesPager({
        blocks,
        ...defaultParams,
      }),
    )

    // Content page should come first (index 0), exercises after
    expect(result.current.pageState.type).toBe('contentPage')
    expect(result.current.pageState.blockIndex).toBe(0)
    expect(result.current.totalContentPages).toBe(1)
    expect(result.current.totalExercises).toBe(2)
  })

  it('preserves relative order within content pages group', () => {
    const blocks = createMockBlocks([
      { type: 'contentPage', id: 'cp-1', slug: 'cp-1' },
      { type: 'exercise', id: 'ex-1', slug: 'ex-1' },
      { type: 'contentPage', id: 'cp-2', slug: 'cp-2' },
      { type: 'contentPage', id: 'cp-3', slug: 'cp-3' },
    ])

    const { result } = renderHook(() =>
      useExercisesPager({
        blocks,
        ...defaultParams,
      }),
    )

    // Reordered: cp-1, cp-2, cp-3, ex-1
    expect(result.current.pageState.type).toBe('contentPage')
    expect(result.current.totalContentPages).toBe(3)
    expect(result.current.totalExercises).toBe(1)
  })

  it('preserves relative order within exercises group', () => {
    const blocks = createMockBlocks([
      { type: 'exercise', id: 'ex-1', slug: 'ex-1' },
      { type: 'contentPage', id: 'cp-1', slug: 'cp-1' },
      { type: 'exercise', id: 'ex-2', slug: 'ex-2' },
      { type: 'exercise', id: 'ex-3', slug: 'ex-3' },
    ])

    const { result } = renderHook(() =>
      useExercisesPager({
        blocks,
        ...defaultParams,
      }),
    )

    // Reordered: cp-1, ex-1, ex-2, ex-3
    expect(result.current.pageState.type).toBe('contentPage')
    expect(result.current.totalContentPages).toBe(1)
    expect(result.current.totalExercises).toBe(3)
  })

  it('handles all content pages correctly', () => {
    const blocks = createMockBlocks([
      { type: 'contentPage', id: 'cp-1', slug: 'cp-1' },
      { type: 'contentPage', id: 'cp-2', slug: 'cp-2' },
    ])

    const { result } = renderHook(() =>
      useExercisesPager({
        blocks,
        ...defaultParams,
      }),
    )

    expect(result.current.pageState.type).toBe('contentPage')
    expect(result.current.totalContentPages).toBe(2)
    expect(result.current.totalExercises).toBe(0)
    expect(result.current.canGoNext).toBe(true)
    expect(result.current.canGoPrev).toBe(false)
  })

  it('handles all exercises correctly', () => {
    const blocks = createMockBlocks([
      { type: 'exercise', id: 'ex-1', slug: 'ex-1' },
      { type: 'exercise', id: 'ex-2', slug: 'ex-2' },
    ])

    const { result } = renderHook(() =>
      useExercisesPager({
        blocks,
        ...defaultParams,
      }),
    )

    expect(result.current.pageState.type).toBe('exercise')
    expect(result.current.totalContentPages).toBe(0)
    expect(result.current.totalExercises).toBe(2)
  })

  it('getExerciseOrdinal returns correct ordinal after reordering', () => {
    const blocks = createMockBlocks([
      { type: 'contentPage', id: 'cp-1', slug: 'cp-1' },
      { type: 'exercise', id: 'ex-1', slug: 'ex-1' },
      { type: 'exercise', id: 'ex-2', slug: 'ex-2' },
    ])

    const { result } = renderHook(() =>
      useExercisesPager({
        blocks,
        ...defaultParams,
        initialExerciseIndex: 1,
      }),
    )

    // First block is content page, so exercise at block index 1 is ordinal 1
    expect(result.current.getExerciseOrdinal()).toBe(1)
  })

  it('can navigate next through all reordered blocks', () => {
    const blocks = createMockBlocks([
      { type: 'contentPage', id: 'cp-1', slug: 'cp-1' },
      { type: 'exercise', id: 'ex-1', slug: 'ex-1' },
      { type: 'exercise', id: 'ex-2', slug: 'ex-2' },
    ])

    const { result } = renderHook(() =>
      useExercisesPager({
        blocks,
        ...defaultParams,
      }),
    )

    expect(result.current.pageState.blockIndex).toBe(0)

    act(() => {
      result.current.handleNext()
    })

    expect(result.current.pageState.blockIndex).toBe(1)
    expect(result.current.getExerciseOrdinal()).toBe(1)

    act(() => {
      result.current.handleNext()
    })

    expect(result.current.pageState.blockIndex).toBe(2)
    expect(result.current.getExerciseOrdinal()).toBe(2)
  })

  it('can navigate prev through all reordered blocks', () => {
    const blocks = createMockBlocks([
      { type: 'contentPage', id: 'cp-1', slug: 'cp-1' },
      { type: 'exercise', id: 'ex-1', slug: 'ex-1' },
      { type: 'exercise', id: 'ex-2', slug: 'ex-2' },
    ])

    const { result } = renderHook(() =>
      useExercisesPager({
        blocks,
        ...defaultParams,
        initialExerciseIndex: 2,
      }),
    )

    expect(result.current.pageState.blockIndex).toBe(2)

    act(() => {
      result.current.handlePrev()
    })

    expect(result.current.pageState.blockIndex).toBe(1)

    act(() => {
      result.current.handlePrev()
    })

    expect(result.current.pageState.blockIndex).toBe(0)
  })
})

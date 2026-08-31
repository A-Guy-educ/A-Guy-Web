// @vitest-environment jsdom
import { useNotebook } from '@/ui/web/notebook/useNotebook'
import type { NotebookStroke } from '@/ui/web/notebook/useNotebook'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const makeStroke = (color = '#000'): NotebookStroke => ({
  color,
  size: 4,
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
  ],
})

describe('useNotebook', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hydrates from localStorage on mount', () => {
    const key = 'a-guy:notebook:exercise-42'
    localStorage.setItem(key, JSON.stringify([makeStroke('#111')]))
    const { result } = renderHook(() => useNotebook('exercise-42'))
    expect(result.current.strokes).toHaveLength(1)
    expect(result.current.strokes[0].color).toBe('#111')
  })

  it('starts empty when no saved data', () => {
    const { result } = renderHook(() => useNotebook('exercise-new'))
    expect(result.current.strokes).toEqual([])
  })

  it('recovers gracefully from malformed JSON', () => {
    localStorage.setItem('a-guy:notebook:broken', '{not-json')
    const { result } = renderHook(() => useNotebook('broken'))
    expect(result.current.strokes).toEqual([])
  })

  it('ignores non-array JSON payloads', () => {
    localStorage.setItem('a-guy:notebook:wrong-shape', JSON.stringify({ nope: true }))
    const { result } = renderHook(() => useNotebook('wrong-shape'))
    expect(result.current.strokes).toEqual([])
  })

  it('addStroke appends and persists', () => {
    const { result } = renderHook(() => useNotebook('scope-a'))
    act(() => result.current.addStroke(makeStroke('#dc2626')))
    expect(result.current.strokes).toHaveLength(1)
    const saved = JSON.parse(localStorage.getItem('a-guy:notebook:scope-a')!) as NotebookStroke[]
    expect(saved[0].color).toBe('#dc2626')
  })

  it('undo pops the last stroke and persists', () => {
    const { result } = renderHook(() => useNotebook('scope-b'))
    act(() => result.current.addStroke(makeStroke('a')))
    act(() => result.current.addStroke(makeStroke('b')))
    act(() => result.current.undo())
    expect(result.current.strokes.map((s) => s.color)).toEqual(['a'])
    const saved = JSON.parse(localStorage.getItem('a-guy:notebook:scope-b')!) as NotebookStroke[]
    expect(saved).toHaveLength(1)
  })

  it('undo on empty state is a no-op', () => {
    const { result } = renderHook(() => useNotebook('scope-c'))
    act(() => result.current.undo())
    expect(result.current.strokes).toEqual([])
  })

  it('clear wipes strokes and persists an empty list', () => {
    const { result } = renderHook(() => useNotebook('scope-d'))
    act(() => result.current.addStroke(makeStroke()))
    act(() => result.current.clear())
    expect(result.current.strokes).toEqual([])
    expect(localStorage.getItem('a-guy:notebook:scope-d')).toBe('[]')
  })

  it('re-hydrates when storageKey changes (per-exercise isolation)', () => {
    localStorage.setItem('a-guy:notebook:ex-1', JSON.stringify([makeStroke('one')]))
    localStorage.setItem('a-guy:notebook:ex-2', JSON.stringify([makeStroke('two')]))
    const { result, rerender } = renderHook(({ key }) => useNotebook(key), {
      initialProps: { key: 'ex-1' },
    })
    expect(result.current.strokes[0].color).toBe('one')
    rerender({ key: 'ex-2' })
    expect(result.current.strokes[0].color).toBe('two')
  })

  it('survives localStorage.setItem throwing (quota exceeded)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    const { result } = renderHook(() => useNotebook('quota'))
    expect(() => act(() => result.current.addStroke(makeStroke()))).not.toThrow()
    // Still updated in-memory even though persistence failed.
    expect(result.current.strokes).toHaveLength(1)
    spy.mockRestore()
  })
})

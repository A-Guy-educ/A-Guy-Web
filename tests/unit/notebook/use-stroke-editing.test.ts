// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  NOTEBOOK_MAX_STROKES,
  type NotebookPage,
  type NotebookStroke,
} from '@/infra/types/notebook'
import { useStrokeEditing } from '@/ui/web/notebook/LessonNotebook/useStrokeEditing'

const LOOP = [100, 100, 300, 100, 300, 300, 100, 300]
const inside = { ink: 0, points: [150, 150, 200, 200] }
const outside = { ink: 1, points: [500, 500, 600, 600] }

function setup(initial: NotebookStroke[], otherStrokes: NotebookStroke[] = []) {
  const pages: Record<string, NotebookPage> = {
    a: { id: 'a', height: 1000, strokes: initial } as NotebookPage,
    b: { id: 'b', height: 1000, strokes: otherStrokes } as NotebookPage,
  }
  const setStrokes = vi.fn((id: string, strokes: NotebookStroke[]) => {
    pages[id] = { ...pages[id], strokes }
  })
  const onPageFull = vi.fn()
  const { result } = renderHook(() => useStrokeEditing(setStrokes, onPageFull))
  return { result, pages, setStrokes, onPageFull }
}

describe('useStrokeEditing', () => {
  it('drops the newest stroke when a page has no history yet', () => {
    const { result, pages } = setup([inside, outside])
    act(() => result.current.undo(pages.a))
    expect(pages.a.strokes).toEqual([inside])
  })

  it('selecting does not change or save the page', () => {
    const { result, pages, setStrokes } = setup([inside, outside])
    act(() => result.current.lasso(pages.a, LOOP))
    expect(result.current.selection).toMatchObject({
      pageId: 'a',
      selected: [inside],
      rest: [outside],
    })
    expect(setStrokes).not.toHaveBeenCalled()
  })

  it('moving saves the strokes at their new place and keeps them selected', () => {
    const { result, pages } = setup([inside, outside])
    act(() => result.current.lasso(pages.a, LOOP))
    act(() => result.current.moveSelection(pages.a, 10, 20))
    const moved = { ink: 0, points: [160, 170, 210, 220] }
    expect(pages.a.strokes).toEqual([outside, moved])
    expect(result.current.selection?.selected).toEqual([moved])
  })

  it('undo after a move puts the strokes back instead of deleting one', () => {
    const { result, pages } = setup([inside, outside])
    act(() => result.current.lasso(pages.a, LOOP))
    act(() => result.current.moveSelection(pages.a, 10, 20))
    act(() => result.current.undo(pages.a))
    expect(pages.a.strokes).toEqual([inside, outside])
    expect(result.current.selection).toBeNull()
  })

  it('walks back through several edits in order', () => {
    const { result, pages } = setup([])
    act(() => result.current.applyStrokes(pages.a, [inside]))
    act(() => result.current.applyStrokes(pages.a, [inside, outside]))
    act(() => result.current.undo(pages.a))
    expect(pages.a.strokes).toEqual([inside])
    act(() => result.current.undo(pages.a))
    expect(pages.a.strokes).toEqual([])
  })

  it('pastes onto another page, selected, and undo removes only the paste', () => {
    const { result, pages } = setup([inside, outside], [outside])
    act(() => result.current.lasso(pages.a, LOOP))
    act(() => result.current.copySelection())
    expect(result.current.canPaste).toBe(true)

    act(() => result.current.paste(pages.b, 400))
    expect(pages.b.strokes).toHaveLength(2)
    expect(pages.b.strokes[1].points).not.toEqual(inside.points)
    expect(result.current.selection).toMatchObject({ pageId: 'b', rest: [outside] })
    expect(pages.a.strokes).toEqual([inside, outside])

    act(() => result.current.undo(pages.b))
    expect(pages.b.strokes).toEqual([outside])
  })

  it('refuses a paste that the server would reject', () => {
    const full = Array<NotebookStroke>(NOTEBOOK_MAX_STROKES).fill(outside)
    const { result, pages, setStrokes, onPageFull } = setup([inside], full)
    act(() => result.current.lasso(pages.a, LOOP))
    act(() => result.current.copySelection())
    act(() => result.current.paste(pages.b, 400))
    expect(onPageFull).toHaveBeenCalledOnce()
    expect(setStrokes).not.toHaveBeenCalled()
  })

  it('selects nothing when the loop catches no ink', () => {
    const { result, pages } = setup([outside])
    act(() => result.current.lasso(pages.a, LOOP))
    expect(result.current.selection).toBeNull()
  })
})

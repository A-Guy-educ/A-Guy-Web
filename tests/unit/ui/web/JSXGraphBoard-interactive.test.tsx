// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { initBoard } = vi.hoisted(() => ({
  initBoard: vi.fn((_id: string, _opts: Record<string, unknown>) => ({ create: vi.fn() })),
}))

vi.mock('jsxgraph', () => ({
  default: { JSXGraph: { initBoard, freeBoard: vi.fn() } },
}))

import { JSXGraphBoard } from '@/ui/web/exerciserenderer/graphics/JSXGraphBoard'

function board(interactive?: boolean) {
  return (
    <JSXGraphBoard
      id="b1"
      width={200}
      height={200}
      onBoardReady={() => {}}
      {...(interactive === undefined ? {} : { interactive })}
    />
  )
}

function renderBoard(interactive?: boolean) {
  const { container } = render(board(interactive))
  return container.firstElementChild as HTMLElement
}

async function lastInitOptions() {
  await waitFor(() => expect(initBoard).toHaveBeenCalled())
  return initBoard.mock.calls.at(-1)![1]
}

afterEach(() => {
  cleanup()
  initBoard.mockClear()
})

describe('JSXGraphBoard interactive prop', () => {
  it('blocks pointer events when interactive is false', () => {
    expect(renderBoard(false).className).toContain('pointer-events-none')
  })

  it.each([true, undefined])('keeps pointer events when interactive is %s', (interactive) => {
    expect(renderBoard(interactive).className).not.toContain('pointer-events-none')
  })

  it('passes registerEvents: false to initBoard when interactive is false', async () => {
    renderBoard(false)
    expect(await lastInitOptions()).toMatchObject({ registerEvents: false })
  })

  it.each([true, undefined])('omits registerEvents when interactive is %s', async (interactive) => {
    renderBoard(interactive)
    expect(await lastInitOptions()).not.toHaveProperty('registerEvents')
  })

  it('re-creates the board when interactive changes', async () => {
    const { rerender } = render(board(true))
    expect(await lastInitOptions()).not.toHaveProperty('registerEvents')

    initBoard.mockClear()
    rerender(board(false))
    expect(await lastInitOptions()).toMatchObject({ registerEvents: false })
  })
})

// @vitest-environment jsdom
import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('jsxgraph', () => ({
  default: {
    JSXGraph: { initBoard: vi.fn(() => ({ create: vi.fn() })), freeBoard: vi.fn() },
  },
}))

import { JSXGraphBoard } from '@/ui/web/exerciserenderer/graphics/JSXGraphBoard'

function renderBoard(interactive?: boolean) {
  const { container } = render(
    <JSXGraphBoard
      id="b1"
      width={200}
      height={200}
      onBoardReady={() => {}}
      {...(interactive === undefined ? {} : { interactive })}
    />,
  )
  return container.firstElementChild as HTMLElement
}

describe('JSXGraphBoard interactive prop', () => {
  it('blocks pointer events when interactive is false', () => {
    expect(renderBoard(false).className).toContain('pointer-events-none')
  })

  it.each([true, undefined])('keeps pointer events when interactive is %s', (interactive) => {
    expect(renderBoard(interactive).className).not.toContain('pointer-events-none')
  })
})

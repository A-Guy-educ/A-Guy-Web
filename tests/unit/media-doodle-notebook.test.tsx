// @vitest-environment jsdom

/**
 * FloatingNotebook — mode-switch + check-button test.
 *
 * The drawing surface itself (pen strokes, erase composite) is not covered
 * here because jsdom has no 2D canvas context; the existing AskDrawingCanvas
 * ships with the same gap for the same reason. What IS covered: the state
 * transition between pen mode (DoodleCanvas with a <canvas>) and text mode
 * (DoodleTextArea with a <textarea>), plus the fact that the ✓ button only
 * renders when `onCheck` is provided.
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { FloatingNotebook } from '@/ui/web/notebook/FloatingNotebook'
import { I18nProvider } from '@/ui/web/providers/I18n'

const messages = {
  courses: {
    doodleNotebook: {
      title: 'Scratch',
      penMode: 'Pen',
      textMode: 'Text',
      clear: 'Clear',
      check: 'Check',
      eraser: 'Eraser',
      color: 'Color',
      resize: 'Resize',
      textPlaceholder: 'You can write here.',
    },
  },
}

beforeAll(() => {
  // jsdom ships without ResizeObserver — DoodleCanvas uses one to keep the
  // canvas buffer in sync with its CSS size. The test only needs the hook
  // to exist; it never fires in jsdom's layout-less environment.
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class StubResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  }
})

function renderNotebook(props: Partial<Parameters<typeof FloatingNotebook>[0]> = {}) {
  const containerRef = createRef<HTMLDivElement>()
  return render(
    <I18nProvider locale="en" messages={messages}>
      <div ref={containerRef} style={{ position: 'relative', width: 800, height: 600 }}>
        <FloatingNotebook containerRef={containerRef} {...props} />
      </div>
    </I18nProvider>,
  )
}

describe('FloatingNotebook', () => {
  it('defaults to text mode (renders the textarea)', () => {
    const { container } = renderNotebook()
    expect(screen.getByRole('dialog', { name: 'Scratch' })).toBeTruthy()
    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()
    expect(textarea?.placeholder).toContain('write here')
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('swaps the textarea for the canvas when switching to pen mode', () => {
    const { container } = renderNotebook()
    fireEvent.click(screen.getByRole('button', { name: 'Pen' }))
    expect(container.querySelector('textarea')).toBeNull()
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('swaps back to the textarea when returning to text mode', () => {
    const { container } = renderNotebook()
    fireEvent.click(screen.getByRole('button', { name: 'Pen' }))
    expect(container.querySelector('canvas')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Text' }))
    expect(container.querySelector('textarea')).not.toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('does NOT render the ✓ check button when onCheck is omitted', () => {
    renderNotebook({ initialMode: 'pen' })
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull()
  })

  it('renders the ✓ check button in pen mode when onCheck is provided', () => {
    const onCheck = vi.fn()
    renderNotebook({ initialMode: 'pen', onCheck })
    expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy()
  })

  it('hides the ✓ check button in text mode even when onCheck is provided', () => {
    const onCheck = vi.fn()
    renderNotebook({ initialMode: 'text', onCheck })
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull()
  })
})

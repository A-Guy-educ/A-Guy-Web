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
 *
 * Both surfaces stay MOUNTED across fold / mode-switch so canvas pixels and
 * typed text persist; the inactive one is just hidden via the Tailwind
 * `hidden` class on its wrapper. Visibility checks here walk up to that
 * wrapper via `.closest('.hidden')` instead of asserting on element
 * presence, which would always be true now.
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

/** True if the element OR any ancestor carries the Tailwind `hidden` class. */
function isCssHidden(el: Element | null): boolean {
  return !!el?.closest('.hidden')
}

describe('FloatingNotebook', () => {
  it('defaults to text mode: textarea visible, canvas hidden', () => {
    const { container } = renderNotebook()
    expect(screen.getByRole('dialog', { name: 'Scratch' })).toBeTruthy()
    const textarea = container.querySelector('textarea')
    const canvas = container.querySelector('canvas')
    expect(textarea).not.toBeNull()
    expect(canvas).not.toBeNull() // mounted (persistence) but hidden
    expect(textarea?.placeholder).toContain('write here')
    expect(isCssHidden(textarea)).toBe(false)
    expect(isCssHidden(canvas)).toBe(true)
  })

  it('swaps visibility when switching to pen mode (both stay mounted)', () => {
    const { container } = renderNotebook()
    fireEvent.click(screen.getByRole('button', { name: 'Pen' }))
    const textarea = container.querySelector('textarea')
    const canvas = container.querySelector('canvas')
    expect(textarea).not.toBeNull()
    expect(canvas).not.toBeNull()
    expect(isCssHidden(canvas)).toBe(false)
    expect(isCssHidden(textarea)).toBe(true)
  })

  it('swaps back when returning to text mode (both stay mounted)', () => {
    const { container } = renderNotebook()
    fireEvent.click(screen.getByRole('button', { name: 'Pen' }))
    expect(isCssHidden(container.querySelector('canvas'))).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Text' }))
    expect(isCssHidden(container.querySelector('textarea'))).toBe(false)
    expect(isCssHidden(container.querySelector('canvas'))).toBe(true)
  })

  it('does NOT render the ✓ check button when onCheck is omitted', () => {
    renderNotebook({ initialMode: 'pen' })
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull()
  })

  it('renders the ✓ check button when onCheck is provided (pen mode)', () => {
    const onCheck = vi.fn()
    renderNotebook({ initialMode: 'pen', onCheck })
    const btn = screen.getByRole('button', { name: 'Check' })
    expect(btn).toBeTruthy()
    expect(isCssHidden(btn)).toBe(false)
  })

  it('hides the ✓ check button in text mode even when onCheck is provided', () => {
    const onCheck = vi.fn()
    renderNotebook({ initialMode: 'text', onCheck })
    // Button still exists in the DOM (DoodleCanvas is mounted) but its
    // wrapper is hidden, so the student can't click through.
    const btn = screen.queryByRole('button', { name: 'Check' })
    expect(btn).not.toBeNull()
    expect(isCssHidden(btn)).toBe(true)
  })
})

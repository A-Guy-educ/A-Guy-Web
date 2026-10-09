// @vitest-environment jsdom

/**
 * MediaDoodleNotebook — fold/unfold toggle test.
 *
 * The drawing surface itself (pen strokes, erase composite) is not covered
 * here because jsdom has no 2D canvas context; the existing AskDrawingCanvas
 * ships with the same gap for the same reason. What IS covered: the state
 * transition between expanded (DoodleCanvas present) and folded (hidden).
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'

import { MediaDoodleNotebook } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/MediaDoodleNotebook'
import { I18nProvider } from '@/ui/web/providers/I18n'

const messages = {
  courses: {
    doodleNotebook: {
      title: 'Scratch',
      collapse: 'Collapse',
      expand: 'Expand',
      clear: 'Clear',
      eraser: 'Eraser',
      color: 'Color',
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

function renderNotebook() {
  const containerRef = createRef<HTMLDivElement>()
  return render(
    <I18nProvider locale="en" messages={messages}>
      <div ref={containerRef} style={{ position: 'relative', width: 800, height: 600 }}>
        <MediaDoodleNotebook containerRef={containerRef} />
      </div>
    </I18nProvider>,
  )
}

describe('MediaDoodleNotebook', () => {
  it('renders the drawing canvas when expanded', () => {
    const { container } = renderNotebook()
    expect(screen.getByRole('dialog', { name: 'Scratch' })).toBeTruthy()
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('folds to a tab (hides the canvas) when the chevron is clicked', () => {
    const { container } = renderNotebook()
    const toggle = screen.getByRole('button', { name: 'Collapse' })
    fireEvent.click(toggle)
    expect(container.querySelector('canvas')).toBeNull()
    // The toggle re-labels itself to the "expand" affordance once folded.
    expect(screen.getByRole('button', { name: 'Expand' })).toBeTruthy()
  })

  it('restores the canvas when the folded tab is re-expanded', () => {
    const { container } = renderNotebook()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(container.querySelector('canvas')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    expect(container.querySelector('canvas')).not.toBeNull()
  })
})

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NotebookCut, NotebookPage } from '@/infra/types/notebook'
import { LatestCutButton, latestCutOf } from '@/ui/web/notebook/LessonNotebook/LatestCutButton'
import { I18nProvider } from '@/ui/web/providers/I18n'

const mockIsTabletUp = vi.hoisted(() => vi.fn())
vi.mock('@/client/hooks/useMediaQuery', () => ({ useMediaQuery: mockIsTabletUp }))

const messages = {
  courses: {
    lessonNotebook: {
      showLatestCut: 'Show last cut',
      hideLatestCut: 'Hide cut',
      latestCutTitle: 'Original exercise cut',
      sourceWithPage: '{label} · page {page}',
      cutAlt: 'Cut',
    },
  },
}

function cutNamed(name: string): NotebookCut {
  return {
    mediaId: name,
    url: `https://blob.example.com/${name}.png`,
    width: 800,
    height: 240,
    source: { kind: 'pdf', label: 'worksheet', page: 2 },
  }
}

function page(createdAt: string, cut: NotebookCut | null): NotebookPage {
  return {
    id: createdAt,
    scope: { kind: 'lesson', lessonId: 'lesson-1' },
    height: 1150,
    cut,
    strokes: [],
    createdAt,
    updatedAt: createdAt,
  }
}

function tree(cut: NotebookCut | null) {
  return (
    <I18nProvider locale="en" messages={messages}>
      <LatestCutButton cut={cut} />
    </I18nProvider>
  )
}

beforeEach(() => {
  mockIsTabletUp.mockReset().mockReturnValue(true)
})

afterEach(() => {
  cleanup()
})

describe('LatestCutButton', () => {
  it('shows nothing until there is a cut', () => {
    render(tree(null))

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('opens the cut and follows a newer one', () => {
    const { rerender } = render(tree(cutNamed('first')))

    fireEvent.click(screen.getByRole('button', { name: 'Show last cut' }))
    expect(screen.getByAltText('Cut').getAttribute('src')).toContain('first.png')
    expect(screen.getByText('worksheet · page 2')).toBeTruthy()

    rerender(tree(cutNamed('second')))
    expect(screen.getByAltText('Cut').getAttribute('src')).toContain('second.png')
  })

  it('closes from the card', () => {
    render(tree(cutNamed('first')))
    const toggle = screen.getByRole('button', { name: 'Show last cut' })

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Hide cut' }))
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('stays hidden on phones', () => {
    mockIsTabletUp.mockReturnValue(false)
    render(tree(cutNamed('first')))

    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('latestCutOf', () => {
  it('picks the newest page with a cut, skipping blank pages', () => {
    const older = cutNamed('older')
    const newer = cutNamed('newer')

    expect(
      latestCutOf([
        page('2026-11-01T10:00:00Z', older),
        page('2026-11-03T10:00:00Z', null),
        page('2026-11-02T10:00:00Z', newer),
      ]),
    ).toBe(newer)
  })

  it('returns null when no page has a cut', () => {
    expect(latestCutOf([page('2026-11-01T10:00:00Z', null)])).toBeNull()
  })
})

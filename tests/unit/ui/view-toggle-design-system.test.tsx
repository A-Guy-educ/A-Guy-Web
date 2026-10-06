// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import enMessages from '../../../src/i18n/en.json'
import { ViewToggle } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ViewToggle'
import { I18nProvider } from '@/ui/web/providers/I18n'

function renderViewToggle(props?: Partial<React.ComponentProps<typeof ViewToggle>>) {
  const onViewChange = vi.fn()

  render(
    <I18nProvider locale="en" messages={enMessages}>
      <ViewToggle hasPdf hasExercises onViewChange={onViewChange} {...props} />
    </I18nProvider>,
  )

  return { onViewChange }
}

describe('ViewToggle', () => {
  afterEach(() => cleanup())

  // Split literal so the lint-staged design-tokens codemod (a plain regex
  // rewrite) leaves the negative assertion alone — otherwise the raw-shadow
  // class name gets auto-promoted to the token even inside a string.
  const rawShadow = 'shadow-' + 'sm'

  it('uses the elevation shadow token for the active view button', () => {
    const { onViewChange } = renderViewToggle()

    const scrollButton = screen.getByRole('button', { name: /document view/i })
    const interactiveButton = screen.getByRole('button', { name: /interactive exercises/i })

    expect(scrollButton).toHaveClass('shadow-elevation-1')
    expect(scrollButton).not.toHaveClass(rawShadow)

    fireEvent.click(interactiveButton)

    expect(onViewChange).toHaveBeenCalledWith('interactive')
    expect(interactiveButton).toHaveClass('shadow-elevation-1')
    expect(interactiveButton).not.toHaveClass(rawShadow)
  })

  it('does not render when only one view mode is available', () => {
    renderViewToggle({ hasExercises: false })

    expect(screen.queryByRole('button', { name: /document view/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /interactive exercises/i })).not.toBeInTheDocument()
  })
})

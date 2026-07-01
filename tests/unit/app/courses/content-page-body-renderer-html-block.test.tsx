// @vitest-environment jsdom
// Regression test for #676: HtmlBlock in lesson content page body must render
// admin-authored HTML as real DOM nodes (not escaped text), and inline/display
// math inside that HTML must render as KaTeX.

import { ContentPageBodyRenderer } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ContentPageBodyRenderer'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

afterEach(() => {
  cleanup()
})

describe('ContentPageBodyRenderer — HtmlBlock (#676)', () => {
  it('renders admin-authored HTML tags as real DOM elements instead of escaped text', () => {
    const html = [
      '<!DOCTYPE html>',
      '<html lang="he" dir="rtl">',
      '  <body>',
      '    <header><h1>כותרת השיעור</h1></header>',
      '    <p>Some paragraph text.</p>',
      '  </body>',
      '</html>',
    ].join('\n')

    const { container } = render(
      <ContentPageBodyRenderer blocks={[{ blockType: 'html', html }]} />,
    )

    // Real DOM elements must exist (not text nodes containing '<!DOCTYPE html>')
    expect(container.querySelector('header')).not.toBeNull()
    expect(container.querySelector('h1')).not.toBeNull()
    expect(container.querySelector('p')).not.toBeNull()

    // The literal "<!DOCTYPE html>" string must NOT leak into the rendered text
    expect(container.textContent).not.toContain('<!DOCTYPE html>')
    expect(container.textContent).not.toContain('<html lang="he" dir="rtl">')

    // The Hebrew heading text should be rendered (and not preceded by markup text)
    expect(container.querySelector('h1')?.textContent).toContain('כותרת השיעור')
  })

  it('renders inline $...$ math inside HtmlBlock as KaTeX', () => {
    const html = '<section><p>The quadratic is $x^2+4x$ in this lesson.</p></section>'

    const { container } = render(
      <ContentPageBodyRenderer blocks={[{ blockType: 'html', html }]} />,
    )

    // The <section> wrapper must be a real DOM node
    expect(container.querySelector('section')).not.toBeNull()
    expect(container.querySelector('p')).not.toBeNull()

    // KaTeX output must exist for the inline expression
    expect(container.querySelector('.katex')).not.toBeNull()

    // The raw "$x^2+4x$" string must NOT appear as plain text
    expect(container.textContent).not.toContain('$x^2+4x$')
  })

  it('renders display $$...$$ math inside HtmlBlock as KaTeX display mode', () => {
    const html = '<article><p>Block math:</p><p>$$x^2 + y^2 = z^2$$</p></article>'

    const { container } = render(
      <ContentPageBodyRenderer blocks={[{ blockType: 'html', html }]} />,
    )

    expect(container.querySelector('article')).not.toBeNull()
    expect(container.querySelector('.katex-display')).not.toBeNull()
    expect(container.querySelector('.katex')).not.toBeNull()
    expect(container.textContent).not.toContain('$$x^2 + y^2 = z^2$$')
  })
})
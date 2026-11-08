// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import React from 'react'
import { LexicalToReact } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ContentPageBodyRenderer/lexicalToReact'

function renderParagraph(text: string): Document {
  const root = {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', text }] }],
  }
  const html = renderToString(<LexicalToReact root={root} />)
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('LexicalToReact - format tokens', () => {
  it('keeps an align line whole through server HTML parsing', () => {
    const parsed = renderParagraph('::text-align-right{שורה}')

    expect(parsed.body.children).toHaveLength(1)
    expect(parsed.querySelector('p')).toBeNull()
    expect(parsed.querySelector('div.aguy-text-align-right')?.textContent).toBe('שורה')
  })

  it('still renders ordinary text in a paragraph', () => {
    const parsed = renderParagraph('::text-size-normal{בכיתה יש }')

    expect(parsed.querySelector('p .aguy-text-size-normal')?.textContent).toBe('בכיתה יש ')
  })
})

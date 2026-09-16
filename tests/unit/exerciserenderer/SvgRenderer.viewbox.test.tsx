// @vitest-environment jsdom
import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SvgRenderer } from '@/ui/web/exerciserenderer/blocks/SvgRenderer'
import type { SvgBlock } from '@/ui/web/exerciserenderer/types'

/**
 * Regression: greyed chat history was rendering author-sized SVGs (fixed
 * width="300", no viewBox) even though the post-mount useEffect should have
 * backfilled a viewBox and swapped width to 100%. Without a viewBox, CSS
 * `[&>svg]:w-full` sizes the SVG box to 100% but content is drawn at fixed
 * pixel coordinates — the SVG looks tiny in a wide container.
 *
 * Baking `ensureSvgViewBox` into the sanitize step means the viewBox is
 * present in the string that goes into `dangerouslySetInnerHTML`, so the
 * DOM has a viewBox from the very first paint regardless of whether the
 * effect fires under the current React lifecycle.
 */
describe('SvgRenderer — viewBox is present in the DOM on first paint', () => {
  it('backfills a viewBox from width/height into the sanitized markup', () => {
    const block: SvgBlock = {
      id: 'svg-1',
      type: 'svg',
      value:
        '<svg width="300" height="70" xmlns="http://www.w3.org/2000/svg"><text x="10" y="40" font-size="30">A + B</text></svg>',
    }
    const { container } = render(<SvgRenderer block={block} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // The viewBox lives on the string sanitizeSvg → dangerouslySetInnerHTML
    // wrote, so it's guaranteed on the first paint (no useEffect timing).
    expect(svg?.getAttribute('viewBox')).toBe('0 0 300 70')
  })

  it('preserves an author-declared viewBox as-is', () => {
    const block: SvgBlock = {
      id: 'svg-2',
      type: 'svg',
      value:
        '<svg viewBox="0 0 500 200" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
    }
    const { container } = render(<SvgRenderer block={block} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 500 200')
  })
})

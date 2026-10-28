// @vitest-environment jsdom
import React from 'react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { render } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import { SvgRenderer } from '@/ui/web/exerciserenderer/blocks/SvgRenderer'
import type { SvgBlock } from '@/ui/web/exerciserenderer/types'

/**
 * Sketches and JSXGraph boards are authored for a white page. They render in
 * light-theme colors (data-theme="light") inside a `.diagram-invert` layer,
 * which globals.css flips in dark mode. Without it, dark mode shows a white
 * card, or black strokes on the dark card.
 */

beforeAll(() => {
  if (typeof window === 'undefined' || window.matchMedia) return
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
})

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('diagrams in dark mode', () => {
  it('SvgRenderer draws the sketch in a light-theme layer that flips in dark mode', () => {
    const block: SvgBlock = {
      id: 'svg-dark',
      type: 'svg',
      value:
        '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="white"/></svg>',
    }
    const { container } = render(<SvgRenderer block={block} />)
    const layer = container.querySelector('svg')?.parentElement

    expect(layer?.getAttribute('data-theme')).toBe('light')
    expect(layer?.classList.contains('diagram-invert')).toBe(true)
  })

  it('JSXGraphBoard container uses the same light-theme layer', () => {
    const source = read('src/ui/web/exerciserenderer/graphics/JSXGraphBoard.tsx')
    expect(source).toMatch(/data-theme="light"/)
    expect(source).toMatch(/'diagram-invert /)
  })

  it('globals.css flips .diagram-invert only in dark mode', () => {
    const css = read('src/app/(frontend)/globals.css').replace(/\r\n/g, '\n')
    expect(css).toMatch(
      /\[data-theme='dark'\] \.diagram-invert \{\n\s*filter: invert\(0\.9\) hue-rotate\(180deg\);/,
    )
  })

  it('graph elements default to the white-canvas ink, not the theme foreground', () => {
    for (const file of ['axisElements.ts', 'geometryElements.ts', 'geometryAngleMarkers.ts']) {
      const source = read(`src/ui/web/exerciserenderer/graphics/${file}`)
      expect(source).not.toMatch(/getDefaultTextColor/)
      // Axis points default to the hardcoded blue fallback, also theme-independent
      expect(source).toMatch(/getDefaultCanvasElementColor|getDefaultAxisPointColor/)
    }
  })
})

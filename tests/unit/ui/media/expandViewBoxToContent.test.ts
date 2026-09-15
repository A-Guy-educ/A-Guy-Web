// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  expandViewBoxToContent,
  expandViewBoxWhenReady,
} from '@/ui/web/media/SVGMedia/expandViewBoxToContent'

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Build a mounted `<svg>` whose `getBBox()` returns the supplied rect.
 * jsdom does not implement `getBBox` — every test stubs it per instance.
 */
function makeSvg(viewBox: string | null, bbox: DOMRect | Error | null): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
  if (viewBox !== null) svg.setAttribute('viewBox', viewBox)
  Object.defineProperty(svg, 'getBBox', {
    configurable: true,
    value: () => {
      if (bbox instanceof Error) throw bbox
      return bbox
    },
  })
  document.body.appendChild(svg)
  return svg
}

function rect(x: number, y: number, width: number, height: number): DOMRect {
  return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height } as DOMRect
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('expandViewBoxToContent', () => {
  it('expands the viewBox width when content overflows to the right', () => {
    const svg = makeSvg('0 0 250 70', rect(10, 20, 300, 40))
    expandViewBoxToContent(svg)
    expect(svg.getAttribute('viewBox')).toBe('0 0 310 70')
  })

  it('expands the viewBox height when content overflows to the bottom', () => {
    const svg = makeSvg('0 0 100 50', rect(0, 0, 100, 80))
    expandViewBoxToContent(svg)
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 80')
  })

  it('expands the origin when content extends past the left/top edges', () => {
    const svg = makeSvg('0 0 100 100', rect(-20, -10, 100, 100))
    expandViewBoxToContent(svg)
    expect(svg.getAttribute('viewBox')).toBe('-20 -10 120 110')
  })

  it('leaves the viewBox untouched when content already fits inside it', () => {
    const svg = makeSvg('0 0 250 70', rect(10, 10, 100, 40))
    expandViewBoxToContent(svg)
    expect(svg.getAttribute('viewBox')).toBe('0 0 250 70')
  })

  it('never shrinks the viewBox to a tighter bbox', () => {
    const svg = makeSvg('0 0 500 500', rect(50, 50, 100, 100))
    expandViewBoxToContent(svg)
    expect(svg.getAttribute('viewBox')).toBe('0 0 500 500')
  })

  it('is a no-op when the SVG has no viewBox at all', () => {
    const svg = makeSvg(null, rect(0, 0, 300, 300))
    expandViewBoxToContent(svg)
    expect(svg.getAttribute('viewBox')).toBeNull()
  })

  it('is a no-op when the viewBox is malformed', () => {
    const svg = makeSvg('not a viewBox', rect(0, 0, 300, 300))
    expandViewBoxToContent(svg)
    expect(svg.getAttribute('viewBox')).toBe('not a viewBox')
  })

  it('is a no-op when getBBox throws (jsdom, disconnected trees, etc.)', () => {
    const svg = makeSvg('0 0 250 70', new Error('jsdom does not implement getBBox'))
    expandViewBoxToContent(svg)
    expect(svg.getAttribute('viewBox')).toBe('0 0 250 70')
  })

  it('is a no-op when the bbox is empty (zero-width or zero-height content)', () => {
    const svgZeroW = makeSvg('0 0 250 70', rect(10, 10, 0, 40))
    expandViewBoxToContent(svgZeroW)
    expect(svgZeroW.getAttribute('viewBox')).toBe('0 0 250 70')

    const svgZeroH = makeSvg('0 0 250 70', rect(10, 10, 100, 0))
    expandViewBoxToContent(svgZeroH)
    expect(svgZeroH.getAttribute('viewBox')).toBe('0 0 250 70')
  })

  it('is idempotent — running twice with the same content produces the same result', () => {
    const svg = makeSvg('0 0 250 70', rect(10, 20, 300, 40))
    expandViewBoxToContent(svg)
    const first = svg.getAttribute('viewBox')
    expandViewBoxToContent(svg)
    // Second call sees a viewBox that already covers the bbox → no change.
    expect(svg.getAttribute('viewBox')).toBe(first)
  })

  it('accepts comma-separated viewBox values (a valid SVG syntax variant)', () => {
    const svg = makeSvg('0, 0, 250, 70', rect(10, 20, 300, 40))
    expandViewBoxToContent(svg)
    expect(svg.getAttribute('viewBox')).toBe('0 0 310 70')
  })
})

describe('expandViewBoxToContent — intrinsic width/height scaling', () => {
  it('scales numeric width and height in lock-step with the viewBox growth', () => {
    const svg = makeSvg('0 0 250 70', rect(10, 20, 300, 40))
    svg.setAttribute('width', '250')
    svg.setAttribute('height', '70')

    expandViewBoxToContent(svg)

    // viewBox grew width 250 → 310 (factor 1.24). Height unchanged.
    expect(svg.getAttribute('viewBox')).toBe('0 0 310 70')
    expect(svg.getAttribute('width')).toBe('310')
    expect(svg.getAttribute('height')).toBe('70')
  })

  it('preserves a px suffix when scaling', () => {
    const svg = makeSvg('0 0 100 100', rect(0, 0, 200, 100))
    svg.setAttribute('width', '100px')
    svg.setAttribute('height', '100px')

    expandViewBoxToContent(svg)

    expect(svg.getAttribute('width')).toBe('200px')
    expect(svg.getAttribute('height')).toBe('100px')
  })

  it('leaves percentage widths untouched (deferred to render context)', () => {
    const svg = makeSvg('0 0 250 70', rect(10, 20, 300, 40))
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', 'auto')

    expandViewBoxToContent(svg)

    // viewBox still expands, but the container-relative attrs stay put so
    // we don't fight the layout the caller wired up (e.g. SvgRenderer).
    expect(svg.getAttribute('viewBox')).toBe('0 0 310 70')
    expect(svg.getAttribute('width')).toBe('100%')
    expect(svg.getAttribute('height')).toBe('auto')
  })

  it('does not touch width or height when the viewBox itself did not change', () => {
    const svg = makeSvg('0 0 250 70', rect(10, 10, 100, 40))
    svg.setAttribute('width', '250')
    svg.setAttribute('height', '70')

    expandViewBoxToContent(svg)

    expect(svg.getAttribute('viewBox')).toBe('0 0 250 70')
    expect(svg.getAttribute('width')).toBe('250')
    expect(svg.getAttribute('height')).toBe('70')
  })

  it('scales both dimensions independently when both bbox extents overflow', () => {
    const svg = makeSvg('0 0 100 50', rect(0, 0, 200, 100))
    svg.setAttribute('width', '100')
    svg.setAttribute('height', '50')

    expandViewBoxToContent(svg)

    // Width factor 200/100 = 2, height factor 100/50 = 2.
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 100')
    expect(svg.getAttribute('width')).toBe('200')
    expect(svg.getAttribute('height')).toBe('100')
  })
})

describe('expandViewBoxWhenReady', () => {
  it('expands the viewBox synchronously so no-text SVGs never render clipped', () => {
    const svg = makeSvg('0 0 100 50', rect(0, 0, 200, 50))
    expandViewBoxWhenReady(svg)
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 50')
  })

  it('re-runs after document.fonts.ready when the SVG contains <text>', async () => {
    // Text bbox widens once web fonts load — simulate that by returning a
    // narrow bbox first, then a wider one.
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
    svg.setAttribute('viewBox', '0 0 250 70')
    const text = document.createElementNS(SVG_NS, 'text')
    svg.appendChild(text)
    document.body.appendChild(svg)

    let call = 0
    Object.defineProperty(svg, 'getBBox', {
      configurable: true,
      value: () => {
        call += 1
        return call === 1 ? rect(10, 10, 200, 40) : rect(10, 10, 340, 40)
      },
    })

    const ready = Promise.resolve()
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready } as unknown as FontFaceSet,
    })

    expandViewBoxWhenReady(svg)
    // First pass fits, no change yet.
    expect(svg.getAttribute('viewBox')).toBe('0 0 250 70')

    await ready
    // Second pass after fonts.ready sees the wider bbox and expands.
    expect(svg.getAttribute('viewBox')).toBe('0 0 350 70')
  })

  it('does not schedule a fonts.ready callback when the SVG has no <text>', () => {
    const svg = makeSvg('0 0 100 50', rect(0, 0, 100, 50))
    const readySpy = vi.fn()
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: { then: readySpy } } as unknown as FontFaceSet,
    })

    expandViewBoxWhenReady(svg)
    expect(readySpy).not.toHaveBeenCalled()
  })
})

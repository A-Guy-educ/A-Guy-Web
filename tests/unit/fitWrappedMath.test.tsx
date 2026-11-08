// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import React, { useRef } from 'react'
import { fitWrappedMath } from '@/ui/web/shared/MathMarkdown/fitWrappedMath'
import { useFitWrappedMath } from '@/ui/web/shared/MathMarkdown/useFitWrappedMath'

type FitMark = 'none' | 'shrink' | 'newline'

function rect(left: number, right: number): DOMRect {
  return { left, right } as DOMRect
}

const ON_ONE_LINE = [rect(0, 40), rect(40, 80)]
const ON_TWO_LINES = [rect(0, 40), rect(0, 30)]

/** Builds math whose base positions depend on the mark it currently carries. */
function mathWithLayout(layoutFor: Record<FitMark, DOMRect[]>): HTMLElement {
  const math = document.createElement('span')
  math.className = 'math-long'
  const html = document.createElement('span')
  html.className = 'katex-html'
  math.append(html)

  layoutFor.none.forEach((_, index) => {
    const base = document.createElement('span')
    base.className = 'base'
    base.getBoundingClientRect = () => {
      const mark = (math.getAttribute('data-math-fit') ?? 'none') as FitMark
      return layoutFor[mark][index]
    }
    html.append(base)
  })
  return math
}

function containerWith(...children: HTMLElement[]): HTMLElement {
  const container = document.createElement('div')
  container.append(...children)
  return container
}

describe('fitWrappedMath', () => {
  it('leaves math that fits on one line unmarked', () => {
    const math = mathWithLayout({
      none: ON_ONE_LINE,
      shrink: ON_ONE_LINE,
      newline: ON_ONE_LINE,
    })
    fitWrappedMath(containerWith(math))
    expect(math.hasAttribute('data-math-fit')).toBe(false)
  })

  it('shrinks math that wraps when 75% is enough', () => {
    const math = mathWithLayout({
      none: ON_TWO_LINES,
      shrink: ON_ONE_LINE,
      newline: ON_ONE_LINE,
    })
    fitWrappedMath(containerWith(math))
    expect(math.getAttribute('data-math-fit')).toBe('shrink')
  })

  it('asks for a new line when math still wraps at 75%', () => {
    const math = mathWithLayout({
      none: ON_TWO_LINES,
      shrink: ON_TWO_LINES,
      newline: ON_ONE_LINE,
    })
    fitWrappedMath(containerWith(math))
    expect(math.getAttribute('data-math-fit')).toBe('newline')
  })

  it('judges each expression separately', () => {
    const fits = mathWithLayout({ none: ON_ONE_LINE, shrink: ON_ONE_LINE, newline: ON_ONE_LINE })
    const wraps = mathWithLayout({ none: ON_TWO_LINES, shrink: ON_ONE_LINE, newline: ON_ONE_LINE })
    fitWrappedMath(containerWith(fits, wraps))
    expect(fits.hasAttribute('data-math-fit')).toBe(false)
    expect(wraps.getAttribute('data-math-fit')).toBe('shrink')
  })

  it('clears an old mark when the math fits again', () => {
    const math = mathWithLayout({ none: ON_ONE_LINE, shrink: ON_ONE_LINE, newline: ON_ONE_LINE })
    math.setAttribute('data-math-fit', 'newline')
    fitWrappedMath(containerWith(math))
    expect(math.hasAttribute('data-math-fit')).toBe(false)
  })

  it('ignores a single-base expression, which cannot wrap', () => {
    const math = mathWithLayout({
      none: [rect(0, 40)],
      shrink: [rect(0, 40)],
      newline: [rect(0, 40)],
    })
    fitWrappedMath(containerWith(math))
    expect(math.hasAttribute('data-math-fit')).toBe(false)
  })
})

describe('useFitWrappedMath', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function Harness({ math }: { math: boolean }) {
    const ref = useRef<HTMLDivElement>(null)
    useFitWrappedMath(ref, 'content')
    return <div ref={ref}>{math && <span className="math-short" />}</div>
  }

  function stubResizeObserver() {
    const instances: { callback: () => void; disconnect: ReturnType<typeof vi.fn> }[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        disconnect = vi.fn()
        observe = vi.fn()
        constructor(callback: () => void) {
          instances.push({ callback, disconnect: this.disconnect })
        }
      },
    )
    return instances
  }

  function setWidth(element: Element, width: number) {
    Object.defineProperty(element, 'offsetWidth', { configurable: true, value: width })
  }

  it('refits only when the width differs from the last fit', () => {
    const instances = stubResizeObserver()
    const querySpy = vi.spyOn(HTMLElement.prototype, 'querySelectorAll')
    const { container } = render(<Harness math />)
    const root = container.firstElementChild as HTMLElement
    const fitCalls = () => querySpy.mock.contexts.filter((context) => context === root).length

    const afterMount = fitCalls()
    instances[0].callback()
    expect(fitCalls()).toBe(afterMount)

    setWidth(root, 320)
    instances[0].callback()
    expect(fitCalls()).toBe(afterMount + 1)

    querySpy.mockRestore()
  })

  it('does not observe content without math, and disconnects on unmount', () => {
    const instances = stubResizeObserver()
    render(<Harness math={false} />).unmount()
    expect(instances).toHaveLength(0)

    render(<Harness math />).unmount()
    expect(instances[0].disconnect).toHaveBeenCalledOnce()
  })
})

/**
 * @fileType hook
 * @domain ui
 * @pattern dom-measurement
 * @ai-summary Re-runs fitWrappedMath when rendered markdown, its width, or the KaTeX fonts change.
 */

'use client'

import { useLayoutEffect, type RefObject } from 'react'
import { containsMath, fitWrappedMath } from './fitWrappedMath'

export function useFitWrappedMath(ref: RefObject<HTMLElement | null>, content: string): void {
  useLayoutEffect(() => {
    const container = ref.current
    if (!container || !containsMath(container)) return

    // Moving math to a new line can widen the container itself, so only a
    // width different from the one left by the last fit should trigger a refit.
    let fittedWidth = -1
    let isActive = true
    const fit = () => {
      fitWrappedMath(container)
      fittedWidth = container.offsetWidth
    }

    fit()
    // KaTeX's web fonts change glyph widths once they load.
    void document.fonts?.ready.then(() => {
      if (isActive) fit()
    })

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (container.offsetWidth !== fittedWidth) fit()
          })
    observer?.observe(container)

    return () => {
      isActive = false
      observer?.disconnect()
    }
  }, [ref, content])
}

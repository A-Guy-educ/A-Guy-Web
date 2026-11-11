'use client'

import { useEffect, useState } from 'react'

// Order is the stored `ink` index: black, blue, red, green. New inks go at the
// end so saved pages keep their colours. In dark mode the page is dark, so the
// notebook tokens swap black for white and lift the colours to match.
const NOTEBOOK_INK_VARS = [
  '--notebook-ink-1',
  '--notebook-ink-3',
  '--notebook-ink-2',
  '--notebook-ink-4',
] as const
const FALLBACK_INKS = ['#000000', '#2563eb', '#ef4444', '#16a34a']

export interface InkPalette {
  /** For the page on screen, in the current theme. */
  inks: string[]
  /** For ink drawn on white paper, such as the "check page" image, in any theme. */
  paperInks: string[]
}

function resolveInks(style: CSSStyleDeclaration): string[] {
  return NOTEBOOK_INK_VARS.map((name, i) => {
    const raw = style.getPropertyValue(name).trim()
    return raw ? `hsl(${raw})` : FALLBACK_INKS[i]
  })
}

/**
 * Resolve the pen inks from the design tokens, and again whenever the theme
 * changes. Strokes store an index, not a colour, so re-resolving is enough to
 * re-tint saved work. Paper inks come from a probe forced to the light theme.
 */
export function useInkPalette(): InkPalette {
  const [palette, setPalette] = useState<InkPalette>({
    inks: FALLBACK_INKS,
    paperInks: FALLBACK_INKS,
  })

  useEffect(() => {
    const read = () => {
      const probe = document.createElement('span')
      probe.dataset.theme = 'light'
      probe.hidden = true
      document.body.append(probe)
      setPalette({
        inks: resolveInks(getComputedStyle(document.documentElement)),
        paperInks: resolveInks(getComputedStyle(probe)),
      })
      probe.remove()
    }
    read()
    // The theme lives on <html>; watching it avoids depending on when the
    // theme provider applies it relative to this effect.
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    })
    return () => observer.disconnect()
  }, [])

  return palette
}

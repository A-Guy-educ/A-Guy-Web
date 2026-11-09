'use client'

import { useEffect, useState } from 'react'

// Same palette and fallbacks as the floating notebook and the Ask drawing
// canvas, so ink looks identical everywhere. Order is the stored `ink` index:
// near-black, blue, red, green. New inks go at the end so saved pages keep their colours.
const PEN_INK_VARS = ['--pen-ink-1', '--pen-ink-3', '--pen-ink-2', '--pen-ink-4'] as const
const FALLBACK_INKS = ['#000000', '#2563eb', '#ef4444', '#16a34a']

/**
 * Resolve the pen inks from the design tokens. Strokes store an index, not a
 * colour, so re-resolving here is enough to re-tint saved work for the theme.
 */
export function useInkPalette(): string[] {
  const [inks, setInks] = useState<string[]>(FALLBACK_INKS)

  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    setInks(
      PEN_INK_VARS.map((name, i) => {
        const raw = style.getPropertyValue(name).trim()
        return raw ? `hsl(${raw})` : FALLBACK_INKS[i]
      }),
    )
  }, [])

  return inks
}

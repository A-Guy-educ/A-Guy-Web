'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** How long a tapped tool's name stays up. */
const HINT_MS = 1400

export interface ToolHint {
  /** Changes on every tap, so tapping the same tool again replays the hint. */
  id: number
  label: string
}

/**
 * Tooltips for touch. A `title` only shows on mouse hover, so a finger or
 * stylus tap on a toolbar button briefly shows that button's `aria-label`
 * instead. Mouse users keep the native tooltip.
 */
export function useTouchToolHint() {
  const [hint, setHint] = useState<ToolHint | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' || !(e.target instanceof Element)) return
    const label = e.target.closest('button')?.getAttribute('aria-label')
    if (!label) return
    clearTimeout(timer.current)
    setHint((previous) => ({ id: (previous?.id ?? 0) + 1, label }))
    timer.current = setTimeout(() => setHint(null), HINT_MS)
  }, [])

  return { hint, onPointerUp }
}

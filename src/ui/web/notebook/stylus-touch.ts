/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Detects Apple Pencil touches. iPadOS Safari runs its native touch gestures (long-press text selection, callout, panning) for the Pencil as well as fingers, and `touch-action` alone does not stop the long-press — only a non-passive `touchstart` `preventDefault()` does.
 */
import { type RefObject, useEffect } from 'react'

/** WebKit-only `Touch.touchType`; absent from the standard DOM typings. */
type WebKitTouch = Touch & { touchType?: 'direct' | 'stylus' }

/** True when the touch that started this event is an Apple Pencil. */
export function isStylusTouch(e: TouchEvent): boolean {
  return Array.from(e.changedTouches).some((t) => (t as WebKitTouch).touchType === 'stylus')
}

/**
 * Claims Pencil touches on `ref` from Safari (pointer events still fire), and
 * finger touches when they draw. Other fingers are left alone so they scroll.
 */
export function useClaimPencilTouches(ref: RefObject<Element | null>, fingerDraws: boolean): void {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const block = (e: Event) => {
      if (fingerDraws || isStylusTouch(e as TouchEvent)) e.preventDefault()
    }
    element.addEventListener('touchstart', block, { passive: false })
    return () => element.removeEventListener('touchstart', block)
  }, [ref, fingerDraws])
}

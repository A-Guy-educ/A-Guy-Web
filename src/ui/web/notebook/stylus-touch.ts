/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Detects Apple Pencil touches. iPadOS Safari runs its native touch gestures (long-press text selection, callout, panning) for the Pencil as well as fingers, and `touch-action` alone does not stop the long-press — only a non-passive `touchstart` `preventDefault()` does.
 */

/** WebKit-only `Touch.touchType`; absent from the standard DOM typings. */
type WebKitTouch = Touch & { touchType?: 'direct' | 'stylus' }

/** True when the touch that started this event is an Apple Pencil. */
export function isStylusTouch(e: TouchEvent): boolean {
  return Array.from(e.changedTouches).some((t) => (t as WebKitTouch).touchType === 'stylus')
}

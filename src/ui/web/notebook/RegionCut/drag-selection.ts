/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Wires mouse/stylus drag-to-select onto a document or element. Touch is ignored so fingers keep scrolling, and controls inside the surface keep working. Apple Pencil touches are claimed from Safari so they cut instead of panning or long-press selecting. Shared by the PDF iframe and the rendered worksheet.
 */
import { isStylusTouch } from '@/ui/web/notebook/stylus-touch'
import type { ViewportBox } from './CutSelection'

/** Ignore clicks; a real selection is bigger than this in both directions. */
const MIN_SIDE_PX = 12

/** Clicking these should still do what they do, not start a cut. */
const INTERACTIVE =
  'a, button, input, textarea, select, label, [role="button"], [contenteditable], .jxgbox'

export interface DragSelectionHandlers {
  onStart: () => void
  onMove: (box: ViewportBox) => void
  /** `null` when the drag was too small to be a selection. */
  onEnd: (box: ViewportBox | null) => void
  /** The surface scrolled while no drag was in progress. */
  onScroll: () => void
}

interface DragSelectionOptions {
  /** Map an event's client point into the parent window's viewport. */
  toViewport: (e: PointerEvent) => { x: number; y: number }
  /** Whether a press on this target may start a cut. */
  isSurface: (target: Element) => boolean
  /**
   * Touch cut mode: a finger drag cuts too. `touchSurface` stops panning
   * there while it is on (restored on detach), or the browser would scroll
   * instead of delivering the drag.
   */
  touch?: { touchSurface: HTMLElement | null }
}

function boxFrom(a: { x: number; y: number }, b: { x: number; y: number }): ViewportBox {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}

/** Attach drag selection to `root`; returns the detach function. */
export function attachDragSelection(
  root: Document | HTMLElement,
  { toViewport, isSurface, touch }: DragSelectionOptions,
  handlers: DragSelectionHandlers,
): () => void {
  let start: { x: number; y: number } | null = null
  let pointerId: number | null = null

  const touchSurface = touch?.touchSurface ?? null
  const previousTouchAction = touchSurface?.style.touchAction ?? ''
  if (touchSurface) touchSurface.style.touchAction = 'none'

  const startsCut = (target: EventTarget | null): target is Element => {
    const el = target as Element | null
    return !!el?.closest && !el.closest(INTERACTIVE) && isSurface(el)
  }

  const down = (e: PointerEvent) => {
    if ((e.pointerType === 'touch' && !touch) || e.button !== 0) return
    const target = e.target
    if (!startsCut(target)) return
    e.preventDefault() // no text selection while cutting
    start = toViewport(e)
    pointerId = e.pointerId
    target.setPointerCapture?.(e.pointerId)
    handlers.onStart()
  }
  const move = (e: PointerEvent) => {
    if (start && e.pointerId === pointerId) handlers.onMove(boxFrom(start, toViewport(e)))
  }
  const up = (e: PointerEvent) => {
    if (!start || e.pointerId !== pointerId) return
    const box = boxFrom(start, toViewport(e))
    start = null
    pointerId = null
    handlers.onEnd(box.width >= MIN_SIDE_PX && box.height >= MIN_SIDE_PX ? box : null)
  }
  // iPadOS pans and long-press selects for the Pencil too, and pointer
  // preventDefault does not stop it — only a non-passive touchstart does.
  const touchStart = (e: TouchEvent) => {
    if (isStylusTouch(e) && startsCut(e.target)) e.preventDefault()
  }
  // A finished selection is in screen coordinates, so it goes stale on scroll.
  const scroll = () => {
    if (!start) handlers.onScroll()
  }

  const listeners = [
    ['touchstart', touchStart],
    ['pointerdown', down],
    ['pointermove', move],
    ['pointerup', up],
    ['pointercancel', up],
    ['scroll', scroll],
  ] as const
  for (const [type, listener] of listeners) {
    root.addEventListener(type, listener as EventListener, { capture: true, passive: false })
  }
  return () => {
    for (const [type, listener] of listeners) {
      root.removeEventListener(type, listener as EventListener, true)
    }
    if (touchSurface) touchSurface.style.touchAction = previousTouchAction
  }
}

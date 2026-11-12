'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export const MIN_ZOOM = 1
export const MAX_ZOOM = 2.5
/** How fast a trackpad pinch (a ctrl+wheel event) zooms. */
const WHEEL_ZOOM_RATE = 0.01

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) return parent
  }
  return document.scrollingElement as HTMLElement | null
}

function fingers(e: TouchEvent) {
  const [a, b] = [e.touches[0], e.touches[1]]
  return {
    distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
  }
}

/**
 * Two-finger pinch (and trackpad pinch) zoom for the notebook pages only, not
 * the whole screen. `area` is the horizontally scrolling box the pinch happens
 * in and `content` is what grows; the point between the fingers stays put.
 */
export function usePinchZoom(
  area: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
): number {
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const zoomRef = useRef(MIN_ZOOM)

  useEffect(() => {
    const areaEl = area.current
    if (!areaEl) return
    let pinch: { distance: number; zoom: number } | null = null
    let pending: { zoom: number; x: number; y: number } | null = null
    let frame = 0

    const apply = () => {
      frame = 0
      const target = pending
      const contentEl = content.current
      pending = null
      if (!target || !contentEl || target.zoom === zoomRef.current) return
      const ratio = target.zoom / zoomRef.current
      const before = contentEl.getBoundingClientRect()
      zoomRef.current = target.zoom
      flushSync(() => setZoom(target.zoom))
      const after = contentEl.getBoundingClientRect()
      const wantedLeft = target.x - (target.x - before.left) * ratio
      const wantedTop = target.y - (target.y - before.top) * ratio
      areaEl.scrollLeft += after.left - wantedLeft
      const scroller = scrollParent(areaEl)
      if (scroller) scroller.scrollTop += after.top - wantedTop
    }
    const zoomTo = (next: number, x: number, y: number) => {
      pending = { zoom: clampZoom(next), x, y }
      if (!frame) frame = requestAnimationFrame(apply)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      pinch = { distance: fingers(e).distance, zoom: zoomRef.current }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return
      if (e.cancelable) e.preventDefault()
      const now = fingers(e)
      zoomTo((pinch.zoom * now.distance) / pinch.distance, now.x, now.y)
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null
    }
    // A trackpad pinch arrives as a wheel event with ctrlKey set.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      zoomTo(zoomRef.current * Math.exp(-e.deltaY * WHEEL_ZOOM_RATE), e.clientX, e.clientY)
    }
    // Safari's own pinch events would zoom the whole page.
    const onGesture = (e: Event) => e.preventDefault()

    const listeners = [
      ['touchstart', onTouchStart],
      ['touchmove', onTouchMove],
      ['touchend', onTouchEnd],
      ['touchcancel', onTouchEnd],
      ['wheel', onWheel],
      ['gesturestart', onGesture],
      ['gesturechange', onGesture],
    ] as const
    for (const [type, listener] of listeners) {
      areaEl.addEventListener(type, listener as EventListener, { passive: false })
    }
    return () => {
      for (const [type, listener] of listeners) {
        areaEl.removeEventListener(type, listener as EventListener)
      }
      if (frame) cancelAnimationFrame(frame)
    }
  }, [area, content])

  return zoom
}

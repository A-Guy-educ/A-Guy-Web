'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ViewportBox } from './CutSelection'
import { attachDragSelection, type DragSelectionHandlers } from './drag-selection'

/** Marks the part of a rendered worksheet that can be cut from. */
export const CUT_SURFACE_ATTR = 'data-cut-surface'

/**
 * - `pdf`: listen inside the PDF.js viewer's same-origin iframe (re-attaching
 *   when the iframe is swapped or reloads), on its page area only.
 * - `dom`: listen on the container itself, inside `[data-cut-surface]`.
 */
export type CutSelectionMode = 'pdf' | 'dom'

/**
 * Always-on cut selection: a mouse or stylus drag draws a box, while a finger
 * and the wheel keep scrolling natively. Finger-only devices opt in per cut
 * with `touchCut`. Listening on the material instead of
 * covering it is what lets cutting stay on without blocking scrolling.
 */
export function useCutSelection(
  containerRef: React.RefObject<HTMLElement | null>,
  mode: CutSelectionMode | null,
  /** Touch cut mode is on: a finger drag cuts instead of scrolling. */
  touchCut = false,
) {
  const [box, setBox] = useState<ViewportBox | null>(null)
  const [dragging, setDragging] = useState(false)
  const clear = useCallback(() => setBox(null), [])

  const handlers = useMemo<DragSelectionHandlers>(
    () => ({
      onStart: () => {
        setBox(null)
        setDragging(true)
      },
      onMove: setBox,
      onEnd: (next) => {
        setDragging(false)
        setBox(next)
      },
      onScroll: () => setBox(null),
    }),
    [],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || !mode) return

    if (mode === 'dom') {
      return attachDragSelection(
        container,
        {
          toViewport: (e) => ({ x: e.clientX, y: e.clientY }),
          isSurface: (target) => Boolean(target.closest(`[${CUT_SURFACE_ATTR}]`)),
          touch: touchCut
            ? { touchSurface: container.querySelector<HTMLElement>(`[${CUT_SURFACE_ATTR}]`) }
            : undefined,
        },
        handlers,
      )
    }

    return watchPdfIframe(container, (iframe) => {
      let doc: Document | null = null
      try {
        doc = iframe.contentDocument
      } catch {
        return null // cross-origin — nothing we could read anyway
      }
      if (!doc) return null
      return attachDragSelection(
        doc,
        {
          toViewport: (e) => {
            const frame = iframe.getBoundingClientRect()
            return { x: e.clientX + frame.left, y: e.clientY + frame.top }
          },
          // The page area cuts; the viewer's own toolbar keeps working.
          isSurface: (target) => Boolean(target.closest('#viewerContainer')),
          touch: touchCut ? { touchSurface: doc.getElementById('viewerContainer') } : undefined,
        },
        handlers,
      )
    })
  }, [containerRef, mode, touchCut, handlers])

  return { box, dragging, clear }
}

/**
 * Keep `attach` bound to whichever iframe is currently in `container`, and to
 * its current document — the iframe starts on about:blank and each load swaps
 * the document.
 */
function watchPdfIframe(
  container: HTMLElement,
  attach: (iframe: HTMLIFrameElement) => (() => void) | null,
): () => void {
  let current: HTMLIFrameElement | null = null
  let detachDoc: (() => void) | null = null
  let detachLoad: (() => void) | null = null

  const bind = (iframe: HTMLIFrameElement) => {
    detachDoc?.()
    detachDoc = attach(iframe)
  }

  const sync = () => {
    const iframe = container.querySelector('iframe')
    if (iframe === current) return
    current = iframe
    detachDoc?.()
    detachLoad?.()
    detachDoc = detachLoad = null
    if (!iframe) return
    const onLoad = () => bind(iframe)
    iframe.addEventListener('load', onLoad)
    detachLoad = () => iframe.removeEventListener('load', onLoad)
    bind(iframe)
  }

  const observer = new MutationObserver(sync)
  observer.observe(container, { childList: true, subtree: true })
  sync()
  return () => {
    observer.disconnect()
    detachDoc?.()
    detachLoad?.()
  }
}

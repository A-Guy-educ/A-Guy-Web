'use client'

import { MEDIA_PDF_SCROLL_EVENT } from '@/client/hooks/lesson-visit-heartbeat'

/**
 * A scroll only counts when the user touched the viewer just before it.
 * PDF.js scrolls `#viewerContainer` on its own while opening (restoring the
 * last position, fitting the first page), and those must not mark a visit
 * as "scrolled" for the PDF Scroll Usability KPI.
 */
const USER_INPUT_WINDOW_MS = 1500
const USER_INPUT_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

type PdfJsWindow = Window & {
  PDFViewerApplication?: { initializedPromise?: Promise<void> }
}

/**
 * Watch a same-origin PDF.js iframe and fire `MEDIA_PDF_SCROLL_EVENT` on
 * the parent window the first time the user scrolls the document. Detaches
 * itself after that one event; returns a cleanup for unmount/reload.
 */
export function trackPdfScroll(iframe: HTMLIFrameElement): () => void {
  let cancelled = false
  let detach: (() => void) | null = null

  const attach = async () => {
    try {
      const win = iframe.contentWindow as PdfJsWindow | null
      const app = win?.PDFViewerApplication
      if (!win || !app?.initializedPromise) return
      await app.initializedPromise
      if (cancelled) return
      const container = win.document.getElementById('viewerContainer')
      if (!container) return

      let lastInputAt = 0
      const markInput = () => {
        lastInputAt = Date.now()
      }
      const onScroll = () => {
        if (Date.now() - lastInputAt > USER_INPUT_WINDOW_MS) return
        window.dispatchEvent(new CustomEvent(MEDIA_PDF_SCROLL_EVENT))
        detach?.()
      }

      for (const name of USER_INPUT_EVENTS) {
        win.document.addEventListener(name, markInput, { capture: true, passive: true })
      }
      container.addEventListener('scroll', onScroll, { passive: true })
      detach = () => {
        for (const name of USER_INPUT_EVENTS) {
          win.document.removeEventListener(name, markInput, { capture: true })
        }
        container.removeEventListener('scroll', onScroll)
        detach = null
      }
    } catch {
      // Cross-origin or viewer missing — scroll stays unmeasured.
    }
  }

  attach()

  return () => {
    cancelled = true
    detach?.()
  }
}

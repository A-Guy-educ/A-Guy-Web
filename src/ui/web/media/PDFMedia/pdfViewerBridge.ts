'use client'

import { MEDIA_PDF_PAGE_EVENT, type PdfPageEventDetail } from '@/ui/web/chat/hooks/pdf-context'

type PdfJsPageView = {
  canvas?: HTMLCanvasElement
}

type PdfJsViewerApp = {
  initializedPromise?: Promise<void>
  pdfViewer?: {
    currentPageNumber?: number
    pagesCount?: number
    getPageView?: (index: number) => PdfJsPageView | undefined
  }
  eventBus?: {
    on: (name: string, handler: () => void) => void
    off: (name: string, handler: () => void) => void
  }
}

type PdfJsWindow = Window & { PDFViewerApplication?: PdfJsViewerApp }

function emitPdfPageEvent(detail: PdfPageEventDetail) {
  window.dispatchEvent(new CustomEvent(MEDIA_PDF_PAGE_EVENT, { detail }))
}

/**
 * Subscribe to the PDF.js viewer's EventBus inside a same-origin iframe and
 * re-broadcast page changes on the parent window. Returns a cleanup
 * function that detaches the listeners and clears the stored page context.
 *
 * PDF.js exposes `PDFViewerApplication` as a global on the iframe window and
 * resolves `initializedPromise` once the viewer is wired up — we wait for
 * that before attaching so the EventBus exists.
 */
export function trackPdfPage(iframe: HTMLIFrameElement, filename: string | undefined): () => void {
  let cancelled = false
  let detach: (() => void) | null = null

  const attach = async () => {
    try {
      const win = iframe.contentWindow as PdfJsWindow | null
      const app = win?.PDFViewerApplication
      if (!app?.initializedPromise) return
      await app.initializedPromise
      if (cancelled) return
      const bus = app.eventBus
      if (!bus) return

      const emit = () => {
        const page = app.pdfViewer?.currentPageNumber ?? 1
        const total = app.pdfViewer?.pagesCount ?? 0
        if (!total) return
        emitPdfPageEvent({ page, totalPages: total, filename })
      }
      emit()
      bus.on('pagechanging', emit)
      bus.on('pagesloaded', emit)
      detach = () => {
        bus.off('pagechanging', emit)
        bus.off('pagesloaded', emit)
      }
    } catch {
      // Cross-origin or viewer missing — fall back to no PDF-page context.
    }
  }

  attach()

  return () => {
    cancelled = true
    detach?.()
    emitPdfPageEvent(null)
  }
}

/**
 * Capture the currently rendered PDF page as a PNG data URL by reaching into
 * the viewer's internal page view and reading its canvas. Returns `null` if
 * the viewer isn't ready, the page view has no canvas yet (not scrolled into
 * view / still rendering), or the browser blocks `toDataURL` on the canvas.
 */
export function capturePdfPageImage(iframe: HTMLIFrameElement, pageNumber: number): string | null {
  try {
    const win = iframe.contentWindow as PdfJsWindow | null
    const app = win?.PDFViewerApplication
    const pageView = app?.pdfViewer?.getPageView?.(pageNumber - 1)
    const canvas = pageView?.canvas
    if (!canvas) return null
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

/**
 * Read the current page number from a PDF.js iframe without waiting for an
 * event. Returns `null` if the viewer isn't ready yet.
 */
export function readPdfCurrentPage(iframe: HTMLIFrameElement): number | null {
  try {
    const win = iframe.contentWindow as PdfJsWindow | null
    const page = win?.PDFViewerApplication?.pdfViewer?.currentPageNumber
    return typeof page === 'number' ? page : null
  } catch {
    return null
  }
}

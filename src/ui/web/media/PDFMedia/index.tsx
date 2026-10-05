'use client'

import { SYSTEM_EVENTS, systemEventBus } from '@/infra/system-events'
import { cn } from '@/infra/utils/ui'
import { MEDIA_PDF_PAGE_EVENT, type PdfPageEventDetail } from '@/ui/web/chat/hooks/pdf-context'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Props as MediaProps } from '../types'

/** Timeout (ms) to detect PDF iframe that never loads */
const PDF_LOAD_TIMEOUT_MS = 30_000

function emitPdfPageEvent(detail: PdfPageEventDetail) {
  window.dispatchEvent(new CustomEvent(MEDIA_PDF_PAGE_EVENT, { detail }))
}

/**
 * Subscribe to the PDF.js viewer's EventBus inside the same-origin iframe
 * and re-broadcast page changes on the parent window. Returns a cleanup
 * function that detaches the listeners and clears the stored page context.
 *
 * PDF.js exposes `PDFViewerApplication` as a global on the iframe window
 * and resolves `initializedPromise` once the viewer is wired up — we wait
 * for that before attaching so the EventBus exists.
 */
function trackPdfPage(iframe: HTMLIFrameElement, filename: string | undefined): () => void {
  let cancelled = false
  let detach: (() => void) | null = null

  const attach = async () => {
    try {
      const win = iframe.contentWindow as
        | (Window & {
            PDFViewerApplication?: {
              initializedPromise?: Promise<void>
              pdfViewer?: { currentPageNumber?: number; pagesCount?: number }
              eventBus?: {
                on: (name: string, handler: () => void) => void
                off: (name: string, handler: () => void) => void
              }
            }
          })
        | null
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

export const PDFMedia: React.FC<MediaProps> = (props) => {
  const { resource, className, lessonId, courseId } = props
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadedRef = useRef(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const pdfUrl = React.useMemo(() => {
    if (resource && typeof resource === 'object') {
      const { filename, url } = resource
      if (url) return url
      // Fallback goes through the media proxy route so an Admin-owned file can
      // still be found via redirect; `/media/${filename}` is not a real path.
      return filename ? `/api/media/file/${encodeURIComponent(String(filename))}` : null
    }
    return null
  }, [resource])

  // Track PDF viewed
  useEffect(() => {
    if (pdfUrl && resource && typeof resource === 'object') {
      systemEventBus.emit(SYSTEM_EVENTS.PDF_VIEWED, {
        pdf_url: pdfUrl,
        pdf_title: 'filename' in resource ? String(resource.filename) : undefined,
        page_count: 'pageCount' in resource ? Number(resource.pageCount) : undefined,
      })
    }
  }, [pdfUrl, resource])

  // Track PDF load timeout
  useEffect(() => {
    if (!pdfUrl || !lessonId) return

    loadedRef.current = false

    const timer = setTimeout(() => {
      if (!loadedRef.current) {
        systemEventBus.emit(SYSTEM_EVENTS.LESSON_LOAD_FAILED, {
          lesson_id: lessonId,
          content_type: 'pdf' as const,
          error_type: 'timeout' as const,
          error_message: `PDF iframe did not load within ${PDF_LOAD_TIMEOUT_MS}ms`,
          course_id: courseId,
        })
      }
    }, PDF_LOAD_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [pdfUrl, lessonId, courseId])

  const pdfFilename = React.useMemo(() => {
    if (resource && typeof resource === 'object' && 'filename' in resource) {
      const name = (resource as { filename?: unknown }).filename
      return typeof name === 'string' ? name : undefined
    }
    return undefined
  }, [resource])

  const detachPageTrackerRef = useRef<(() => void) | null>(null)

  const handleIframeLoad = useCallback(() => {
    loadedRef.current = true
    setHasError(false)
    setErrorMessage(null)
    detachPageTrackerRef.current?.()
    const iframe = iframeRef.current
    if (iframe) {
      detachPageTrackerRef.current = trackPdfPage(iframe, pdfFilename)
    }
  }, [pdfFilename])

  // Clean up the page tracker (and clear the chat's last-known page) when
  // the PDF unmounts, swaps to another file, or re-renders via retry.
  useEffect(() => {
    return () => {
      detachPageTrackerRef.current?.()
      detachPageTrackerRef.current = null
    }
  }, [pdfUrl, retryKey])

  const handleIframeError = useCallback(() => {
    if (!lessonId) return
    setHasError(true)
    setErrorMessage('Failed to load PDF. Please try again.')
    systemEventBus.emit(SYSTEM_EVENTS.LESSON_LOAD_FAILED, {
      lesson_id: lessonId,
      content_type: 'pdf' as const,
      error_type: '404' as const,
      error_message: 'PDF iframe failed to load',
      course_id: courseId,
    })
  }, [lessonId, courseId])

  const handleRetry = useCallback(() => {
    setHasError(false)
    setErrorMessage(null)
    setRetryKey((k) => k + 1)
  }, [])

  if (!pdfUrl) {
    return null
  }

  // Load PDF.js viewer via proxy (Blob CDN sets Content-Disposition: attachment)
  // Add version parameter to bust cache when viewer files are updated
  // Include retryKey to allow retrying on error
  const viewerUrl = `/api/pdfjs-viewer?file=${encodeURIComponent(pdfUrl)}&v=4.4.168&retry=${retryKey}`

  return (
    <div className={cn('w-full h-full min-h-0', className)}>
      {hasError ? (
        <div className="flex flex-col items-center justify-center h-full gap-content-gap text-center">
          <div className="flex flex-col gap-content-gap-xs">
            <p className="text-body-md text-text-secondary">
              {errorMessage || 'Failed to load PDF.'}
            </p>
            <button
              onClick={handleRetry}
              className="mx-auto px-4 py-2 bg-primary text-white rounded-button transition-all duration-normal hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <iframe
          key={retryKey}
          ref={iframeRef}
          src={viewerUrl}
          className="w-full h-full border-0"
          title="PDF Viewer"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  )
}

'use client'

/**
 * AskPdfWorkspace
 *
 * Minimal workspace rendered when the Ask page's uploaded file is a PDF:
 * just the PDF.js viewer + a draggable FloatingNotebook over it. No
 * title bar, hint/solution/generate-lesson chrome — a PDF of homework
 * typically has many exercises per page, so the student picks what
 * they're solving in their head and hits ✓ when done. The notebook's
 * ✓ button captures:
 *   - the pen-mode canvas as a PNG data URL
 *   - the currently rendered PDF page as a PNG data URL
 *   - the current page number
 * and dispatches the existing `ask-action` event with `type: 'check'`,
 * which `ChatInterface` already routes through the PDF check prompt
 * (see V1 PR #1343).
 */

import { logger } from '@/infra/utils/logger'
import {
  capturePdfPageImage,
  readPdfCurrentPage,
  trackPdfPage,
} from '@/ui/web/media/PDFMedia/pdfViewerBridge'
import { FloatingNotebook } from '@/ui/web/notebook/FloatingNotebook'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AskActionEvent, ExerciseFile } from '../ask-types'
import { ASK_ACTION_EVENT } from '../ask-types'

interface AskPdfWorkspaceProps {
  file: ExerciseFile
}

function dispatchAskAction(detail: AskActionEvent) {
  window.dispatchEvent(new CustomEvent(ASK_ACTION_EVENT, { detail }))
}

export function AskPdfWorkspace({ file }: AskPdfWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isChecking, setIsChecking] = useState(false)

  // PDF.js's XHR inside the viewer iframe can't read a raw Vercel Blob
  // URL — the cross-origin response falls outside the viewer's CORS
  // envelope. Route the preview through the inline media proxy so PDF.js
  // only ever sees same-origin bytes.
  const canPreview = !!file.filename
  const viewerUrl = canPreview
    ? `/api/pdfjs-viewer?file=${encodeURIComponent(
        `/api/media/file/${encodeURIComponent(file.filename!)}?inline=1`,
      )}&v=4.4.168`
    : null

  // Wire the PDF.js viewer's page-change bus into the chat context so the
  // tutor knows which page the student is viewing. Mirrors PDFMedia's
  // setup; `trackPdfPage` returns a cleanup that clears the stored page.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    let detach: (() => void) | null = null
    const handleLoad = () => {
      detach?.()
      detach = trackPdfPage(iframe, file.filename)
    }
    iframe.addEventListener('load', handleLoad)
    return () => {
      iframe.removeEventListener('load', handleLoad)
      detach?.()
    }
  }, [file.filename])

  const handleCheck = useCallback(
    (notebookImageData: string) => {
      const iframe = iframeRef.current
      if (!iframe) {
        logger.warn('[AskPdfWorkspace] Check pressed but no PDF iframe mounted; dropping request')
        return
      }
      const pageNumber = readPdfCurrentPage(iframe) ?? 1
      const pdfPageImage = capturePdfPageImage(iframe, pageNumber) ?? undefined
      setIsChecking(true)
      dispatchAskAction({
        type: 'check',
        title: file.title,
        imageData: notebookImageData,
        mediaId: file.mediaId,
        pdfPageImage,
        pdfPageNumber: pageNumber,
      })
      // The check turn resolves on the chat side (stream `done` / sync
      // result). We don't have a direct signal here, so a short cooldown
      // avoids a double-tap sending two concurrent checks. If the tutor
      // response takes longer than this the UI will simply re-enable;
      // the chat guard still prevents a true concurrent request.
      window.setTimeout(() => setIsChecking(false), 2000)
    },
    [file.title, file.mediaId],
  )

  if (!viewerUrl) return null

  return (
    <div ref={containerRef} className="relative h-full w-full min-h-0 bg-muted overflow-hidden">
      <iframe
        ref={iframeRef}
        src={viewerUrl}
        title={file.title}
        className="absolute inset-0 w-full h-full border-0"
      />
      <FloatingNotebook
        containerRef={containerRef}
        onCheck={handleCheck}
        checkDisabled={isChecking}
        initialMode="pen"
        initialSize={{ w: 360, h: 320 }}
      />
    </div>
  )
}

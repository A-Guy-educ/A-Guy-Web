'use client'

import { useEffect, useState, type RefObject } from 'react'

import type { Media } from '@/infra/types/content'
import { MEDIA_PDF_PAGE_EVENT } from '@/ui/web/chat/hooks/pdf-context'
import { SheetPreviewPanel, type SheetPreviewContent } from '@/ui/web/chat-tools'
import {
  capturePdfPageImage,
  readPdfCurrentPage,
  readPdfPageCount,
} from '@/ui/web/media/PDFMedia/pdfViewerBridge'
import { useTranslations } from '@/ui/web/providers/I18n'

/** pdf.js draws a page's canvas a moment after the page changes. */
const CAPTURE_RETRY_MS = 300
const CAPTURE_RETRIES = 6

interface MediaSheetPreviewProps {
  file: Media
  kind: 'pdf' | 'image'
  /** The material area holding the PDF.js iframe. */
  containerRef: RefObject<HTMLDivElement | null>
}

/**
 * Miniature of the Media tab's current page for the chat tool rail: the
 * page the PDF viewer is on (copied from its canvas), or the image itself.
 */
export function MediaSheetPreview({ file, kind, containerRef }: MediaSheetPreviewProps) {
  if (kind === 'image') {
    return (
      <SheetPreviewPanel
        label={file.filename ?? null}
        content={
          file.url ? { kind: 'image', src: file.url, alt: file.alt ?? '' } : { kind: 'empty' }
        }
      />
    )
  }
  return <PdfSheetPreview containerRef={containerRef} filename={file.filename ?? ''} />
}

function PdfSheetPreview({
  containerRef,
  filename,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  filename: string
}) {
  const t = useTranslations('courses.chatTools')
  const [page, setPage] = useState<{ number: number; total: number | null; src: string | null }>({
    number: 1,
    total: null,
    src: null,
  })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const capture = (attempt: number) => {
      const iframe = containerRef.current?.querySelector('iframe')
      if (!iframe) return
      const number = readPdfCurrentPage(iframe) ?? 1
      const src = capturePdfPageImage(iframe, number)
      setPage((previous) => ({
        number,
        total: readPdfPageCount(iframe) ?? previous.total,
        // Keep the last good image while the new page is still drawing.
        src: src ?? (previous.number === number ? previous.src : null),
      }))
      if (!src && attempt < CAPTURE_RETRIES) {
        timer = setTimeout(() => capture(attempt + 1), CAPTURE_RETRY_MS)
      }
    }
    const recapture = () => {
      clearTimeout(timer)
      capture(0)
    }

    recapture()
    window.addEventListener(MEDIA_PDF_PAGE_EVENT, recapture)
    return () => {
      clearTimeout(timer)
      window.removeEventListener(MEDIA_PDF_PAGE_EVENT, recapture)
    }
  }, [containerRef])

  const content: SheetPreviewContent = page.src
    ? { kind: 'image', src: page.src, alt: filename }
    : { kind: 'loading' }
  const label = page.total
    ? t('sheetPage')
        .replace('{current}', String(page.number))
        .replace('{total}', String(page.total))
    : null

  return <SheetPreviewPanel label={label} content={content} />
}

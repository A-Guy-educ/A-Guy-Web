/**
 * PDF viewer ↔ chat page-context channel.
 *
 * The PDF.js viewer runs inside a same-origin iframe (served by
 * `/api/pdfjs-viewer`). `PDFMedia` attaches to the viewer's EventBus and
 * dispatches `MEDIA_PDF_PAGE_EVENT` on the window whenever the current page
 * changes. `useNotebookChat` listens for that event and prepends a
 * `<pdf-page>` block to the outgoing prompt so the tutor AI knows which
 * page of which document the student is looking at when they ask.
 *
 * Mirrors the step-context pattern (same escape-on-write / strip-on-load
 * discipline). Filename is user-controlled via upload and must be escaped
 * before interpolation.
 */

export interface PdfPageContext {
  page: number
  totalPages: number
  filename?: string
}

/**
 * Payload for the `media-pdf-page-change` custom event. `null` means the
 * PDF viewer unmounted and the chat should clear its last known page.
 */
export type PdfPageEventDetail = PdfPageContext | null

export const MEDIA_PDF_PAGE_EVENT = 'media-pdf-page-change' as const

export const PDF_PAGE_BLOCK_REGEX = /^<pdf-page[\s\S]*?<\/pdf-page>\s*/

function escapePdfField(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildPromptWithPdfPageContext(message: string, pdf: PdfPageContext | null): string {
  if (!pdf || !pdf.totalPages) return message
  const safeFilename = pdf.filename ? escapePdfField(pdf.filename) : ''
  const fileAttr = safeFilename ? ` file="${safeFilename}"` : ''
  const fileClause = safeFilename ? ` of "${safeFilename}"` : ''
  return (
    `<pdf-page page="${pdf.page}" total="${pdf.totalPages}"${fileAttr}>` +
    `The student is currently viewing page ${pdf.page} of ${pdf.totalPages}${fileClause}.` +
    `</pdf-page>\n\n` +
    message
  )
}

export function stripPdfPageContext(content: string): string {
  return content.replace(PDF_PAGE_BLOCK_REGEX, '')
}

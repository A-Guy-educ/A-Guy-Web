/**
 * FormulaSheetContent
 *
 * @fileType component
 * @domain formula-sheets
 * @pattern content-renderer
 * @ai-summary Server-side renderer for formula sheet content (PDF, RichText, or Blocks)
 */

import type { FormulaSheet } from '@/payload-types'
import { RenderBlocks } from '@/server/payload/blocks/RenderBlocks'
import RichText from '@/ui/web/RichText'

import { PDFEmbed } from '../../courses/PDFViewer/PDFEmbed'

export interface FormulaSheetContentProps {
  /** The formula sheet to render */
  sheet: FormulaSheet
}

/**
 * Render the content of a formula sheet based on its content type.
 *
 * This is a SERVER component — it must be pre-rendered in a server context
 * (e.g., page.tsx) and passed as a ReactNode to client components.
 * RenderBlocks and RichText transitively import payload.config.ts which
 * includes Node.js-only binary modules that cannot be bundled for the browser.
 */
export function FormulaSheetContent({ sheet }: FormulaSheetContentProps) {
  const { contentType, pdfFile, richTextContent, bodyBlocks } = sheet

  switch (contentType) {
    case 'pdf':
      if (!pdfFile || typeof pdfFile === 'string') {
        return null
      }
      return <PDFEmbed pdfUrl={pdfFile.url || `/media/${pdfFile.filename}`} title={sheet.title} />

    case 'richText':
      if (!richTextContent) {
        return null
      }
      return (
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <RichText data={richTextContent} enableProse={false} enableGutter={false} />
        </div>
      )

    case 'blocks':
    default:
      if (!bodyBlocks || !Array.isArray(bodyBlocks) || bodyBlocks.length === 0) {
        return null
      }
      return (
        <div className="formula-sheet-blocks">
          <RenderBlocks blocks={bodyBlocks} />
        </div>
      )
  }
}

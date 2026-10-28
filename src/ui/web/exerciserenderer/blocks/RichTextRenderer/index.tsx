/**
 * Rich Text Renderer
 * Renders markdown with math support (KaTeX) using the shared MathMarkdown component,
 * plus any attached media.
 */

import type { Components } from 'react-markdown'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'
import { SvgAwareImage } from '@/ui/web/shared/MathMarkdown/svgAwareImage'
import { preprocessNewlines } from '@/infra/utils/textPreprocessing'
import { MediaAttachments } from '../../components/MediaAttachments'
import { cn } from '@/infra/utils/ui'

interface RichTextRendererProps {
  block: {
    type: 'rich_text'
    format: 'md-math-v1'
    value: string
    mediaIds?: string[]
  }
  /** Overrides the default `leading-[1.5]` (the scroll view uses roomier lines). */
  lineHeightClassName?: string
}

/**
 * Component overrides for markdown elements rendered inside rich-text
 * explanations. Currently the only override is `img`, which routes through
 * `SvgAwareImage` so SVG diagrams referenced from markdown are inverted in
 * dark mode (issue #652). Centralising this here keeps the behaviour aligned
 * with `ChatMessageContent`, which uses the same helper.
 */
const richTextMarkdownComponents: Components = {
  img: SvgAwareImage,
}

export function RichTextRenderer({ block, lineHeightClassName }: RichTextRendererProps) {
  const processedValue = preprocessNewlines(block.value)

  return (
    <>
      <MathMarkdown
        content={processedValue}
        className={cn('rich-text-content text-foreground', lineHeightClassName ?? 'leading-[1.5]')}
        components={richTextMarkdownComponents}
      />
      <MediaAttachments mediaIds={block.mediaIds} />
    </>
  )
}

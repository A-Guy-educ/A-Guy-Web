/**
 * @fileType component
 * @domain ui
 * @pattern markdown-image-override
 * @ai-summary Markdown `img` override that inverts dark-line SVGs in dark mode while keeping responsive sizing.
 */

import { cn } from '@/infra/utils/ui'
import { isSvgUrl } from '@/infra/utils/isSvgMedia'

/**
 * Shape of the props react-markdown passes to the `img` override. The
 * `src` and `alt` fields are the only ones we use — `title` and
 * metadata like `width`/`height` are intentionally ignored so the
 * override matches what `JSX.IntrinsicElements['img']` exposes.
 */
export interface SvgAwareImageProps {
  src?: string | Blob
  alt?: string
  title?: string
}

/**
 * Markdown `<img>` override that adds `dark:invert` when the source URL
 * points to an SVG asset. Centralised here so ChatMessageContent and
 * RichTextRenderer cannot drift apart in how they handle SVG diagrams.
 */
export function SvgAwareImage({ src, alt, title }: SvgAwareImageProps) {
  if (typeof src !== 'string') return null
  const isSvg = isSvgUrl(src)
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt ?? ''}
      title={title}
      loading="lazy"
      className={cn('h-auto max-h-96 max-w-full w-auto object-contain', isSvg && 'dark:invert')}
    />
  )
}

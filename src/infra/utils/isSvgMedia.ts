/**
 * @fileType utility
 * @domain media
 * @pattern svg-detection
 * @ai-summary Detect whether a Media record represents an SVG asset. Used to apply dark-mode inversion only to SVG (not raster) images.
 */
import type { Media } from '@/infra/types/content'

const SVG_EXTENSION = /\.svg(\?.*)?$/i
const SVG_MIME_TYPE = 'image/svg+xml'

/**
 * Returns true when the given `Media` record represents an SVG asset.
 *
 * Signals checked, in priority order:
 *  1. CMS-driven fields are authoritative: `type === 'svg'`, `mediaType === 'svg'`,
 *     or `mimeType === 'image/svg+xml'`. When any of these is set, the result is
 *     decided by them alone.
 *  2. If no authoritative signal exists, fall back to the URL extension as a hint.
 *
 * Filename is intentionally NOT consulted — it is unreliable when other signals
 * disagree (legacy payloads default to `diagram.svg` regardless of actual type),
 * and trusting it would force `dark:invert` on otherwise-raster images.
 */
export function isSvgMedia(media: Media): boolean {
  if (media.type === 'svg') return true
  if (media.mediaType === 'svg') return true
  if (media.mimeType?.toLowerCase() === SVG_MIME_TYPE) return true
  if (media.url) return SVG_EXTENSION.test(media.url)
  return false
}

/**
 * Test whether a markdown image `src` URL points to an SVG asset.
 *
 * Markdown `<img>` only exposes the URL — no `Media` record or `mimeType`.
 * Used by the chat / rich-text markdown overrides so inline SVG diagrams in
 * chat answers stay readable under dark mode.
 */
export function isSvgUrl(src: string | undefined | null): boolean {
  if (!src) return false
  return SVG_EXTENSION.test(src)
}

/**
 * @fileType utility
 * @domain seo
 * @pattern share-description
 * @ai-summary Builds the og/twitter description so every link preview carries the brand tagline under the page title: tagline alone when the page has no description, "tagline · description" otherwise, untouched when the title already is the tagline.
 */

const SEPARATOR = ' · '

/**
 * WhatsApp / Facebook show og:description as the line under the title. The
 * brand wants its tagline there on every shared page (course names alone read
 * as anonymous links), so it leads the description. Only the share
 * description changes — the SEO `<meta name="description">` is left alone.
 */
export function withShareTagline(
  tagline: string,
  description: string | null | undefined,
  title?: unknown,
): string {
  const desc = description?.trim() ?? ''
  if (title === tagline) return desc || tagline
  if (!desc) return tagline
  if (desc.startsWith(tagline)) return desc
  return `${tagline}${SEPARATOR}${desc}`
}

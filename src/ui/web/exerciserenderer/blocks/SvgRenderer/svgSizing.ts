import type { CSSProperties } from 'react'

// Shared sketch rules (Admin PR #626): 330px tall, at most 75% of the
// container, at least 280px wide. `displaySize` scales all three together so
// the authored percentage shrinks the card and the SVG in tandem; `full`
// (Admin's default) is exactly the unscaled spec.
const SKETCH_HEIGHT_PX = 330
const SKETCH_MAX_WIDTH_PERCENT = 75
const SKETCH_MIN_WIDTH_PX = 280

// Mirrors Admin's selector labels: 25 / 33 / 50 / 75 / 100 %.
const DISPLAY_SIZE_SCALE = {
  xsmall: 0.25,
  small: 0.33,
  medium: 0.5,
  large: 0.75,
  full: 1,
} as const

export type DisplaySize = keyof typeof DISPLAY_SIZE_SCALE

/** Width / height ratio of the first <svg>'s viewBox, or null if absent/invalid. */
export function getSvgAspectRatio(svgMarkup: string): number | null {
  const svgTag = svgMarkup.match(/<svg\b[^>]*>/i)?.[0]
  const viewBox = svgTag?.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1]
  if (!viewBox) return null
  const parts = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (parts.length !== 4) return null
  const [, , width, height] = parts
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }
  return width / height
}

/**
 * Width constraints for the SVG card. Height is never fixed — the SVG fills
 * the card width and takes its height from the viewBox, so the card always
 * hugs the drawing (no letterbox bands on narrow screens).
 *
 * On mobile the authored size is ignored and the 75% cap lifted, matching
 * geometry boards, which sit at their 280px floor and so fill a phone screen.
 */
export function getSvgCardStyle(
  aspectRatio: number | null,
  displaySize: DisplaySize | undefined,
  isMobile = false,
): CSSProperties {
  const scale = isMobile ? 1 : (DISPLAY_SIZE_SCALE[displaySize ?? 'full'] ?? 1)
  const maxPercent = isMobile ? '100%' : `${SKETCH_MAX_WIDTH_PERCENT * scale}%`
  const minWidthPx = Math.round(SKETCH_MIN_WIDTH_PX * scale)

  if (aspectRatio === null) {
    return { width: maxPercent, minWidth: `min(${minWidthPx}px, 100%)` }
  }

  // A tall, narrow drawing keeps its natural width rather than being
  // stretched to the min width (which would push it past the sketch height).
  const naturalWidthPx = Math.round(SKETCH_HEIGHT_PX * scale * aspectRatio)
  return {
    width: `min(${naturalWidthPx}px, ${maxPercent})`,
    minWidth: `min(${Math.min(minWidthPx, naturalWidthPx)}px, 100%)`,
  }
}

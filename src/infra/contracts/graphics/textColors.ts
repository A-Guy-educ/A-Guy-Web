/**
 * Text color palette and size scale utilities for geometry text elements.
 * Shared between admin editor and student renderer.
 *
 * Colors are derived from the design system CSS variables (globals.css).
 * --text-highlight-1 through --text-highlight-8, plus --foreground.
 * Hex values are pre-computed from the HSL definitions for canvas rendering.
 */

/**
 * Predefined color palette for text elements, matching the design system
 * text-highlight variables defined in globals.css.
 */
export const TEXT_COLOR_PALETTE = [
  { label: 'Black', hex: '#1a1b1f' }, // --foreground: 220 9% 11%
  { label: 'Gray', hex: '#6a707c' }, // --text-highlight-8: 220 8% 45%
  { label: 'Red', hex: '#dc2828' }, // --text-highlight-1: 0 72% 51%
  { label: 'Orange', hex: '#f97415' }, // --text-highlight-2: 25 95% 53%
  { label: 'Yellow', hex: '#e7b008' }, // --text-highlight-3: 45 93% 47%
  { label: 'Green', hex: '#21c45d' }, // --text-highlight-4: 142 71% 45%
  { label: 'Blue', hex: '#3c83f6' }, // --text-highlight-5: 217 91% 60%
  { label: 'Purple', hex: '#a855f7' }, // --text-highlight-6: 271 91% 65%
  { label: 'Pink', hex: '#ec4699' }, // --text-highlight-7: 330 81% 60%
] as const

/** Size scale (0-10) to pixel mapping */
const SIZE_SCALE_PX = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24] as const

/** Default size scale value */
export const DEFAULT_TEXT_SIZE_SCALE = 5

/** Default text color (--foreground) */
export const DEFAULT_TEXT_COLOR = '#1a1b1f'

/**
 * Convert size scale (0-10) to pixel value.
 * @param scale - Size scale from 0 to 10
 * @returns Pixel value for fontSize
 */
export function sizeScaleToPixels(scale: number): number {
  return SIZE_SCALE_PX[Math.max(0, Math.min(10, scale))] ?? 14
}

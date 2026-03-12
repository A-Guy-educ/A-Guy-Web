/**
 * Text color palette and size scale utilities for geometry text elements.
 * Shared between admin editor and student renderer.
 */

/** Predefined 10-color palette for text elements */
export const TEXT_COLOR_PALETTE = [
  { label: 'Black', hex: '#000000' },
  { label: 'Dark Gray', hex: '#555555' },
  { label: 'Red', hex: '#e74c3c' },
  { label: 'Orange', hex: '#e67e22' },
  { label: 'Yellow', hex: '#d4ac0d' },
  { label: 'Green', hex: '#27ae60' },
  { label: 'Teal', hex: '#16a085' },
  { label: 'Blue', hex: '#2980b9' },
  { label: 'Purple', hex: '#8e44ad' },
  { label: 'Pink', hex: '#e91e8c' },
] as const

/** Size scale (0-10) to pixel mapping */
const SIZE_SCALE_PX = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24] as const

/** Default size scale value */
export const DEFAULT_TEXT_SIZE_SCALE = 5

/** Default text color */
export const DEFAULT_TEXT_COLOR = '#000000'

/**
 * Convert size scale (0-10) to pixel value.
 * @param scale - Size scale from 0 to 10
 * @returns Pixel value for fontSize
 */
export function sizeScaleToPixels(scale: number): number {
  return SIZE_SCALE_PX[Math.max(0, Math.min(10, scale))] ?? 14
}

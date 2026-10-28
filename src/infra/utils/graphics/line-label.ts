/**
 * @fileType utility
 * @domain graphics
 * @pattern geometry-label
 * @ai-summary Size and offset of geometry segment labels, shared with the admin editor
 */

/** Label distance from the segment, as a fraction of canvas height */
export const LINE_LABEL_OFFSET_RATIO = 0.021

/** Rendered font size for a segment label (25% larger than the stored size) */
export function lineLabelFontSize(stored?: number): number {
  return (stored || 10) * 1.25
}

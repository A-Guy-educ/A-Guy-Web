/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Hold-to-straighten for notebook strokes: decides whether a stroke the student paused on was meant as a line and, if so, reduces it to its two end points. Mirrors the Apple Notes gesture, which Safari does not give web pages.
 */

/** How long the pointer must rest before a stroke snaps to a line. */
export const STRAIGHTEN_HOLD_MS = 500
/** Screen pixels of hand jitter still counted as holding still. */
export const STRAIGHTEN_SLOP_PX = 6
/** Shorter strokes (page units) are dots or ticks, not lines. */
const MIN_LINE_LENGTH = 20
/** A line may bow by this fraction of its length, or `MIN_WOBBLE`, whichever is larger. */
const MAX_WOBBLE_RATIO = 0.15
const MIN_WOBBLE = 6

/**
 * The stroke reduced to `[x0, y0, x1, y1]` if it is long and straight enough
 * to read as an intended line; otherwise `null` and the stroke stays freehand.
 */
export function straightenStroke(points: readonly number[]): number[] | null {
  if (points.length < 4) return null
  const [x0, y0] = points
  const x1 = points[points.length - 2]
  const y1 = points[points.length - 1]
  const length = Math.hypot(x1 - x0, y1 - y0)
  if (length < MIN_LINE_LENGTH) return null

  const maxWobble = Math.max(MIN_WOBBLE, length * MAX_WOBBLE_RATIO)
  for (let i = 2; i < points.length - 2; i += 2) {
    // Perpendicular distance from the point to the chord.
    const distance =
      Math.abs((x1 - x0) * (y0 - points[i + 1]) - (x0 - points[i]) * (y1 - y0)) / length
    if (distance > maxWobble) return null
  }
  return [x0, y0, x1, y1]
}

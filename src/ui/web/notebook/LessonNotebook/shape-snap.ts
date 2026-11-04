/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Hold-to-snap shapes for notebook strokes: decides whether a stroke the student paused on was meant as a straight line or a circle/oval and, if so, replaces it with the clean shape. Mirrors the Apple Notes gesture, which Safari does not give web pages.
 */
import { roundCoord } from './stroke-render'

/** How long the pointer must rest before a stroke snaps to a shape. */
export const SNAP_HOLD_MS = 500
/** Screen pixels of hand jitter still counted as holding still. */
export const SNAP_SLOP_PX = 6

/** Shorter strokes (page units) are dots or ticks, not lines. */
const MIN_LINE_LENGTH = 20
/** A line may bow by this fraction of its length, or `MIN_WOBBLE`, whichever is larger. */
const MAX_WOBBLE_RATIO = 0.15
const MIN_WOBBLE = 6

/** Smaller loops (page units, longest side) are letters like "o", not shapes. */
const MIN_ELLIPSE_SIZE = 30
/** The gap between the ends may be up to this fraction of the longest side. */
const MAX_CLOSE_GAP_RATIO = 0.3
/** Flatter than this (short side / long side) reads as a line drawn back and forth. */
const MIN_ELLIPSE_ASPECT = 0.25
/** Rounder than this snaps to a true circle rather than an oval. */
const CIRCLE_ASPECT = 0.85
/** How far points may stray from the fitted ellipse, as a fraction of its radius. */
const MAX_MEAN_RADIAL_ERROR = 0.12
const MAX_RADIAL_ERROR = 0.3

export type SnappedShape = 'line' | 'ellipse'

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

/**
 * The stroke redrawn as a clean axis-aligned circle or oval if it is a closed,
 * roughly elliptical loop; otherwise `null`. Squares and triangles fail the
 * fit at their corners, so they stay freehand.
 */
export function ellipseFromStroke(points: readonly number[]): number[] | null {
  if (points.length < 16) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i])
    maxX = Math.max(maxX, points[i])
    minY = Math.min(minY, points[i + 1])
    maxY = Math.max(maxY, points[i + 1])
  }
  const longSide = Math.max(maxX - minX, maxY - minY)
  const shortSide = Math.min(maxX - minX, maxY - minY)
  if (longSide < MIN_ELLIPSE_SIZE || shortSide < longSide * MIN_ELLIPSE_ASPECT) return null

  const gap = Math.hypot(points[0] - points.at(-2)!, points[1] - points.at(-1)!)
  if (gap > longSide * MAX_CLOSE_GAP_RATIO) return null

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  let rx = (maxX - minX) / 2
  let ry = (maxY - minY) / 2

  let errorSum = 0
  for (let i = 0; i < points.length; i += 2) {
    const radial = Math.hypot((points[i] - cx) / rx, (points[i + 1] - cy) / ry)
    const error = Math.abs(radial - 1)
    if (error > MAX_RADIAL_ERROR) return null
    errorSum += error
  }
  if (errorSum / (points.length / 2) > MAX_MEAN_RADIAL_ERROR) return null

  if (shortSide / longSide >= CIRCLE_ASPECT) rx = ry = (rx + ry) / 2
  return ellipsePoints(cx, cy, rx, ry, Math.atan2((points[1] - cy) / ry, (points[0] - cx) / rx))
}

/** The shape the stroke snaps to when held, or `null` to keep it freehand. */
export function snapStroke(
  points: readonly number[],
): { shape: SnappedShape; points: number[] } | null {
  const line = straightenStroke(points)
  if (line) return { shape: 'line', points: line }
  const ellipse = ellipseFromStroke(points)
  if (ellipse) return { shape: 'ellipse', points: ellipse }
  return null
}

/** A closed polyline around the ellipse, starting where the student started. */
function ellipsePoints(cx: number, cy: number, rx: number, ry: number, start: number): number[] {
  const perimeter = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2)
  const segments = Math.min(96, Math.max(24, Math.round(perimeter / 6)))
  const out: number[] = []
  for (let i = 0; i <= segments; i++) {
    const angle = start + (i / segments) * Math.PI * 2
    out.push(roundCoord(cx + rx * Math.cos(angle)), roundCoord(cy + ry * Math.sin(angle)))
  }
  return out
}

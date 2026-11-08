/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Hold-to-snap shapes for notebook strokes: decides whether a stroke the student paused on was meant as a straight line, circle/oval, triangle or rectangle and, if so, replaces it with the clean shape. Mirrors the Apple Notes gesture, which Safari does not give web pages.
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

/** Bends smaller than this fraction of the longest side are hand wobble, not corners. */
const CORNER_TOLERANCE = 0.1
/** A four-cornered shape with angles this close to 90 degrees is squared into a true rectangle. */
const RIGHT_ANGLE_TOLERANCE_DEG = 20
/** A rectangle tilted less than this is straightened to the page. */
const AXIS_SNAP_DEG = 8

export type SnappedShape = 'line' | 'ellipse' | 'polygon'
type Point = readonly [number, number]

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
  const loop = closedLoopBox(points)
  if (!loop) return null
  const { minX, minY, maxX, maxY, longSide, shortSide } = loop

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

/**
 * The stroke redrawn with straight edges if it is a closed loop with three or
 * four corners; otherwise `null`. Four near-right angles become a true
 * rectangle. Any other triangle or four-sided shape keeps the corners the
 * student drew, since those shapes are often the point of a geometry exercise.
 */
export function polygonFromStroke(points: readonly number[]): number[] | null {
  const loop = closedLoopBox(points)
  if (!loop) return null
  const corners = findCorners(points, loop.longSide * CORNER_TOLERANCE)
  if (corners.length !== 3 && corners.length !== 4) return null
  const shape = (corners.length === 4 && squareUp(corners)) || corners
  return [...shape, shape[0]].flatMap(([x, y]) => [roundCoord(x), roundCoord(y)])
}

/** The shape the stroke snaps to when held, or `null` to keep it freehand. */
export function snapStroke(
  points: readonly number[],
): { shape: SnappedShape; points: number[] } | null {
  const line = straightenStroke(points)
  if (line) return { shape: 'line', points: line }
  const ellipse = ellipseFromStroke(points)
  if (ellipse) return { shape: 'ellipse', points: ellipse }
  const polygon = polygonFromStroke(points)
  if (polygon) return { shape: 'polygon', points: polygon }
  return null
}

/** The stroke's bounding box, if it is a closed loop big and round enough to be a shape. */
function closedLoopBox(points: readonly number[]) {
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
  return { minX, minY, maxX, maxY, longSide, shortSide }
}

/** Distance from a point to the segment a-b. */
export function distanceToSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared
    ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / lengthSquared))
    : 0
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy))
}

/** Ramer-Douglas-Peucker: the points of an open path that bend more than `tolerance`. */
function simplify(path: readonly Point[], tolerance: number): Point[] {
  const first = path[0]
  const last = path[path.length - 1]
  let farthest = 0
  let farthestDistance = tolerance
  for (let i = 1; i < path.length - 1; i++) {
    const distance = distanceToSegment(path[i][0], path[i][1], first, last)
    if (distance > farthestDistance) {
      farthest = i
      farthestDistance = distance
    }
  }
  if (!farthest) return [first, last]
  return [
    ...simplify(path.slice(0, farthest + 1), tolerance).slice(0, -1),
    ...simplify(path.slice(farthest), tolerance),
  ]
}

function indexOfFarthest(path: readonly Point[], from: Point): number {
  const distanceTo = (p: Point) => Math.hypot(p[0] - from[0], p[1] - from[1])
  return path.reduce((best, p, i) => (distanceTo(p) > distanceTo(path[best]) ? i : best), 0)
}

/**
 * The corners of a closed stroke. Students start anywhere on the outline, so
 * the loop is first rotated to begin at a real corner: the point farthest from
 * the middle always is one. It is then split at the corner opposite that.
 */
function findCorners(points: readonly number[], tolerance: number): Point[] {
  const path: Point[] = []
  let sumX = 0
  let sumY = 0
  for (let i = 0; i < points.length; i += 2) {
    path.push([points[i], points[i + 1]])
    sumX += points[i]
    sumY += points[i + 1]
  }
  const start = indexOfFarthest(path, [sumX / path.length, sumY / path.length])
  const rotated = [...path.slice(start), ...path.slice(0, start)]
  const opposite = indexOfFarthest(rotated, rotated[0])
  return [
    ...simplify(rotated.slice(0, opposite + 1), tolerance).slice(0, -1),
    ...simplify([...rotated.slice(opposite), rotated[0]], tolerance).slice(0, -1),
  ]
}

/** A true rectangle fitted to four corners, or `null` if the angles aren't near 90 degrees. */
function squareUp(corners: readonly Point[]): Point[] | null {
  let sin = 0
  let cos = 0
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    const c = corners[(i + 2) % 4]
    const incoming = Math.atan2(b[1] - a[1], b[0] - a[0])
    const outgoing = Math.atan2(c[1] - b[1], c[0] - b[0])
    const turn = Math.abs(Math.atan2(Math.sin(outgoing - incoming), Math.cos(outgoing - incoming)))
    if (Math.abs(turn - Math.PI / 2) > (RIGHT_ANGLE_TOLERANCE_DEG * Math.PI) / 180) return null
    // Edges 90 degrees apart point the same way once multiplied by four; weight by length.
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    sin += Math.sin(4 * incoming) * length
    cos += Math.cos(4 * incoming) * length
  }
  const fitted = Math.atan2(sin, cos) / 4
  const angle = Math.abs(fitted) <= (AXIS_SNAP_DEG * Math.PI) / 180 ? 0 : fitted

  const ux = Math.cos(angle)
  const uy = Math.sin(angle)
  const us = corners.map(([x, y]) => x * ux + y * uy).sort((a, b) => a - b)
  const vs = corners.map(([x, y]) => y * ux - x * uy).sort((a, b) => a - b)
  const uLow = (us[0] + us[1]) / 2
  const uHigh = (us[2] + us[3]) / 2
  const vLow = (vs[0] + vs[1]) / 2
  const vHigh = (vs[2] + vs[3]) / 2
  const rectangle: Point[] = [
    [uLow, vLow],
    [uHigh, vLow],
    [uHigh, vHigh],
    [uLow, vHigh],
  ]
  return rectangle.map(([u, v]): Point => [u * ux - v * uy, u * uy + v * ux])
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

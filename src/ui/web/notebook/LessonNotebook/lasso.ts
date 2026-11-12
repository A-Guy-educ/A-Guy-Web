/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Geometry for the notebook lasso: which strokes a drawn loop catches, lifting them off the page, and moving them. Eraser strokes are just later strokes painted over the ink, so anything lifted has its erased parts cut out first or they would reappear once it moves.
 */
import { NOTEBOOK_PAGE_WIDTH, type NotebookStroke } from '@/infra/types/notebook'
import { distanceToSegment } from './shape-snap'
import { ERASER_WIDTH, PEN_WIDTH, roundCoord } from './stroke-render'

/** A stroke counts as caught when this share of it is inside the loop. */
const MIN_INSIDE_RATIO = 0.7
/** Long segments are split this finely (page units) so an eraser can cut through them. */
const MIN_SAMPLE_STEP = 4
/** A resized selection can't shrink below this (page units, longest side). */
const MIN_RESIZE_SIDE = 12

export interface StrokeBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface LiftedStrokes {
  selected: NotebookStroke[]
  rest: NotebookStroke[]
}

function pointInLoop(x: number, y: number, loop: readonly number[]): boolean {
  let inside = false
  for (let i = 0, j = loop.length - 2; i < loop.length; j = i, i += 2) {
    const crosses =
      loop[i + 1] > y !== loop[j + 1] > y &&
      x < ((loop[j] - loop[i]) * (y - loop[i + 1])) / (loop[j + 1] - loop[i + 1]) + loop[i]
    if (crosses) inside = !inside
  }
  return inside
}

function isCaught(points: readonly number[], loop: readonly number[]): boolean {
  let inside = 0
  for (let i = 0; i < points.length; i += 2) {
    if (pointInLoop(points[i], points[i + 1], loop)) inside++
  }
  return inside / (points.length / 2) >= MIN_INSIDE_RATIO
}

function pointsBounds(points: readonly number[], padding: number): StrokeBounds {
  const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  for (let i = 0; i < points.length; i += 2) {
    bounds.left = Math.min(bounds.left, points[i] - padding)
    bounds.right = Math.max(bounds.right, points[i] + padding)
    bounds.top = Math.min(bounds.top, points[i + 1] - padding)
    bounds.bottom = Math.max(bounds.bottom, points[i + 1] + padding)
  }
  return bounds
}

function overlaps(a: StrokeBounds, b: StrokeBounds): boolean {
  return a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom
}

const inkRadius = (stroke: NotebookStroke) => (stroke.width ?? PEN_WIDTH) / 2
const eraserRadius = (stroke: NotebookStroke) => (stroke.width ?? ERASER_WIDTH) / 2

function isNearPath(x: number, y: number, points: readonly number[], reach: number): boolean {
  if (points.length === 2)
    return distanceToSegment(x, y, [points[0], points[1]], [points[0], points[1]]) <= reach
  for (let i = 2; i < points.length; i += 2) {
    const a = [points[i - 2], points[i - 1]] as const
    const b = [points[i], points[i + 1]] as const
    if (distanceToSegment(x, y, a, b) <= reach) return true
  }
  return false
}

function resample(points: readonly number[], step: number): number[] {
  const out = [points[0], points[1]]
  for (let i = 2; i < points.length; i += 2) {
    const dx = points[i] - points[i - 2]
    const dy = points[i + 1] - points[i - 1]
    const parts = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step))
    for (let part = 1; part <= parts; part++) {
      out.push(
        roundCoord(points[i - 2] + (dx * part) / parts),
        roundCoord(points[i - 1] + (dy * part) / parts),
      )
    }
  }
  return out
}

/** The visible pieces of a stroke, given the erasers drawn after it. */
function withoutErased(stroke: NotebookStroke, erasers: readonly NotebookStroke[]) {
  if (!erasers.length) return [stroke]
  const step = Math.max(MIN_SAMPLE_STEP, Math.min(...erasers.map(eraserRadius)) / 2)
  const samples = resample(stroke.points, step)
  const pieces: NotebookStroke[] = []
  let run: number[] = []
  const endRun = () => {
    if (run.length) pieces.push({ ...stroke, points: run })
    run = []
  }
  for (let i = 0; i < samples.length; i += 2) {
    // Ink has round ends, so it needs to stop a full ink-radius short of the eraser.
    const erased = erasers.some((eraser) =>
      isNearPath(
        samples[i],
        samples[i + 1],
        eraser.points,
        eraserRadius(eraser) + inkRadius(stroke),
      ),
    )
    if (erased) endRun()
    else run.push(samples[i], samples[i + 1])
  }
  endRun()
  return pieces
}

/**
 * Separates the ink a loop catches from the rest of the page. `selected`
 * holds only what was visible, so it can be moved without erased parts
 * coming back; `rest` keeps every other stroke, in order.
 */
export function liftStrokes(
  strokes: readonly NotebookStroke[],
  loop: readonly number[],
): LiftedStrokes {
  const erasers = strokes.flatMap((stroke, index) =>
    stroke.erase
      ? [{ stroke, index, bounds: pointsBounds(stroke.points, eraserRadius(stroke)) }]
      : [],
  )
  const selected: NotebookStroke[] = []
  const rest: NotebookStroke[] = []
  strokes.forEach((stroke, index) => {
    if (stroke.erase || !isCaught(stroke.points, loop)) {
      rest.push(stroke)
      return
    }
    const bounds = pointsBounds(stroke.points, inkRadius(stroke))
    const later = erasers
      .filter((eraser) => eraser.index > index && overlaps(eraser.bounds, bounds))
      .map((eraser) => eraser.stroke)
    selected.push(...withoutErased(stroke, later))
  })
  return { selected, rest }
}

export function strokesBounds(strokes: readonly NotebookStroke[]): StrokeBounds {
  return strokes.reduce<StrokeBounds>(
    (all, stroke) => {
      const bounds = pointsBounds(stroke.points, inkRadius(stroke))
      return {
        left: Math.min(all.left, bounds.left),
        top: Math.min(all.top, bounds.top),
        right: Math.max(all.right, bounds.right),
        bottom: Math.max(all.bottom, bounds.bottom),
      }
    },
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
  )
}

export function translateStrokes(
  strokes: readonly NotebookStroke[],
  dx: number,
  dy: number,
): NotebookStroke[] {
  return strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((value, i) => roundCoord(value + (i % 2 === 0 ? dx : dy))),
  }))
}

/** The closest move to (dx, dy) that keeps the strokes on the page. */
export function clampOffset(
  bounds: StrokeBounds,
  dx: number,
  dy: number,
  pageHeight: number,
): { dx: number; dy: number } {
  return {
    dx: Math.max(-bounds.left, Math.min(dx, NOTEBOOK_PAGE_WIDTH - bounds.right)),
    dy: Math.max(-bounds.top, Math.min(dy, pageHeight - bounds.bottom)),
  }
}

/** Strokes scaled about (originX, originY). Line widths stay as drawn, like Apple Notes. */
export function scaleStrokes(
  strokes: readonly NotebookStroke[],
  originX: number,
  originY: number,
  scale: number,
): NotebookStroke[] {
  return strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((value, i) => {
      const origin = i % 2 === 0 ? originX : originY
      return roundCoord(origin + (value - origin) * scale)
    }),
  }))
}

/** The closest scale to `scale` that keeps the box on the page and still visible, grown from its top-left. */
export function clampScale(bounds: StrokeBounds, scale: number, pageHeight: number): number {
  const width = bounds.right - bounds.left
  const height = bounds.bottom - bounds.top
  const largest = Math.min(
    (NOTEBOOK_PAGE_WIDTH - bounds.left) / width,
    (pageHeight - bounds.top) / height,
  )
  const smallest = Math.min(1, MIN_RESIZE_SIDE / Math.max(width, height))
  return Math.max(smallest, Math.min(scale, largest))
}

/**
 * Finds the ink strokes a point touches, for the stroke eraser. Bounds are
 * worked out once per gesture so each pointer sample only measures the
 * strokes that are actually nearby.
 */
export function strokeHitTester(strokes: readonly NotebookStroke[]) {
  const boxes = strokes.map((stroke) =>
    stroke.erase ? null : pointsBounds(stroke.points, inkRadius(stroke)),
  )
  return (x: number, y: number, reach: number): number[] =>
    boxes.flatMap((box, index) =>
      box &&
      x >= box.left - reach &&
      x <= box.right + reach &&
      y >= box.top - reach &&
      y <= box.bottom + reach &&
      isNearPath(x, y, strokes[index].points, reach + inkRadius(strokes[index]))
        ? [index]
        : [],
    )
}

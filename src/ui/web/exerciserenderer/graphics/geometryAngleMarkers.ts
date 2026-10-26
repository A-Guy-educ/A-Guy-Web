/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GeometrySpecV1 } from '@/infra/contracts'
import {
  getAdminCanvasBackground,
  getDefaultTextColor,
} from '@/infra/contracts/graphics/textColors'

type AngleSpec = GeometrySpecV1['elements']['angles'][number]

export interface Vec {
  x: number
  y: number
}

export interface AngleMarkerInput {
  center: Vec
  ray1: Vec
  ray2: Vec
  /** Marker size in screen pixels (arc radius / square side). */
  radiusPx: number
  /** Board pixels per user unit on each axis — they differ whenever the
   *  board's aspect ratio doesn't match its bounding box. */
  unitX: number
  unitY: number
  square: boolean
  /** Approximate half-extent of the label box in pixels; 0 when unlabeled. */
  labelHalfPx: number
  labelPosition?: 'inside' | 'outside'
}

export interface AngleMarker {
  /** Stroked part of the marker (the arc, or the two outer square sides). */
  outline: Vec[]
  /** Closed fill region, starting and ending at the vertex. */
  fill: Vec[]
  /** Label anchor, on the angle bisector. */
  labelAt: Vec
}

const ARC_SAMPLES = 32
const DEFAULT_ARC_RADIUS = 30
const LABEL_GAP_PX = 2
// JSXGraph layers: lines sit on 7, text on 9. The marker stroke goes above the
// lines so a side that starts at the vertex never cuts through the arc, and
// the label goes above everything.
const FILL_LAYER = 3
const OUTLINE_LAYER = 8
const LABEL_LAYER = 10

const TIMES_NEW_ROMAN_CSS = "font-family: 'Times New Roman', Times, serif;"

/**
 * Computes an angle marker in screen-pixel space and maps it back to board
 * coordinates. JSXGraph's own `angle` element takes its radius in user units,
 * so on a board whose x and y scales differ (the sizing clamps make that
 * common) the arc stretches into an ellipse. Working in pixels keeps the arc a
 * true circle and measures the angle the reader actually sees.
 *
 * Always draws the non-reflex side: when the sweep from ray1 to ray2 exceeds
 * 180° the marker starts from ray2 instead.
 */
export function computeAngleMarker(input: AngleMarkerInput): AngleMarker | null {
  const { center, ray1, ray2, radiusPx: r, unitX, unitY, square, labelHalfPx } = input
  const a1 = Math.atan2((ray1.y - center.y) * unitY, (ray1.x - center.x) * unitX)
  const a2 = Math.atan2((ray2.y - center.y) * unitY, (ray2.x - center.x) * unitX)
  if (!Number.isFinite(a1) || !Number.isFinite(a2)) return null

  const ccw = (((a2 - a1) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const start = ccw > Math.PI ? a2 : a1
  const sweep = ccw > Math.PI ? 2 * Math.PI - ccw : ccw
  if (sweep === 0) return null

  const toBoard = (angle: number, distPx: number): Vec => ({
    x: center.x + (distPx * Math.cos(angle)) / unitX,
    y: center.y + (distPx * Math.sin(angle)) / unitY,
  })
  const mid = start + sweep / 2
  const halfSin = Math.sin(sweep / 2)

  let outline: Vec[]
  // Distance from the vertex to the far edge of the marker along the bisector.
  let reachPx: number
  if (square) {
    // Parallelogram with side r along each ray — same shape JSXGraph draws.
    const p1 = toBoard(start, r)
    const p3 = toBoard(start + sweep, r)
    const p2 = { x: p1.x + p3.x - center.x, y: p1.y + p3.y - center.y }
    outline = [p1, p2, p3]
    reachPx = 2 * r * Math.cos(sweep / 2)
  } else {
    outline = Array.from({ length: ARC_SAMPLES + 1 }, (_, i) =>
      toBoard(start + (sweep * i) / ARC_SAMPLES, r),
    )
    reachPx = r
  }

  // Centre the label inside the shaded region when it fits between the rays
  // and within the marker; otherwise put it just outside on the bisector.
  const centroidPx = square ? reachPx / 2 : (4 * r * halfSin) / (3 * sweep)
  const fitPx = halfSin > 0 ? labelHalfPx / halfSin : Infinity
  const insidePx = Math.max(centroidPx, fitPx)
  const fitsInside = input.labelPosition !== 'outside' && insidePx + labelHalfPx <= reachPx
  const labelDistPx = fitsInside ? insidePx : reachPx + labelHalfPx + LABEL_GAP_PX

  return {
    outline,
    fill: [center, ...outline, center],
    labelAt: toBoard(mid, labelDistPx),
  }
}

/** Rough half-extent of a short label (angle letters / degree values). */
function estimateLabelHalfPx(value: string, fontSize: number): number {
  return Math.max(fontSize * 0.55, value.length * fontSize * 0.3)
}

function curve(board: JXG.Board, pts: Vec[], attrs: Record<string, unknown>) {
  board.create('curve', [pts.map((p) => p.x), pts.map((p) => p.y)], {
    fixed: true,
    highlight: false,
    ...attrs,
  } as any)
}

export function renderAngles(
  board: JXG.Board,
  angles: AngleSpec[],
  pointMap: Map<string, any>,
): void {
  const { unitX, unitY } = board as unknown as { unitX: number; unitY: number }
  for (const a of angles) {
    const center = pointMap.get(a.center)
    const ray1 = pointMap.get(a.ray1)
    const ray2 = pointMap.get(a.ray2)
    if (!center || !ray1 || !ray2) continue

    const color = a.color ?? getDefaultTextColor()
    const label = a.label?.value
    const fontSize = a.label?.fontSize ?? 10
    const marker = computeAngleMarker({
      center: { x: center.X(), y: center.Y() },
      ray1: { x: ray1.X(), y: ray1.Y() },
      ray2: { x: ray2.X(), y: ray2.Y() },
      // `arcRadius` was authored in user units on boards that were roughly
      // 1 unit ≈ 1px; the geometric mean keeps the marker the size it was.
      radiusPx: (a.arcRadius ?? DEFAULT_ARC_RADIUS) * Math.sqrt(unitX * unitY),
      unitX,
      unitY,
      square: a.style === 'square',
      labelHalfPx: label ? estimateLabelHalfPx(label, fontSize) : 0,
      labelPosition: a.label?.position,
    })
    if (!marker) continue

    curve(board, marker.fill, {
      strokeWidth: 0,
      fillColor: color,
      fillOpacity: 0.15,
      layer: FILL_LAYER,
    })
    curve(board, marker.outline, {
      strokeColor: color,
      strokeWidth: 2,
      fillColor: 'none',
      layer: OUTLINE_LAYER,
    })

    if (label) {
      // A canvas-coloured halo masks any side passing under the label so it
      // reads as sitting on top of the lines. The board is always white.
      const halo = getAdminCanvasBackground()
      board.create('text', [marker.labelAt.x, marker.labelAt.y, label], {
        fontSize,
        anchorX: 'middle',
        anchorY: 'middle',
        fixed: true,
        highlight: false,
        layer: LABEL_LAYER,
        strokeColor: getDefaultTextColor(),
        cssStyle: `${TIMES_NEW_ROMAN_CSS} font-weight: bold; text-shadow: 0 0 2px ${halo}, 0 0 3px ${halo}, 0 0 4px ${halo};`,
      })
    }
  }
}

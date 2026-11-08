/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Draws stored notebook strokes onto a 2D canvas context in page coordinates. Pure apart from the context it is handed, so page rendering, live drawing and "check page" flattening all share one renderer.
 */
import type { NotebookStroke } from '@/infra/types/notebook'

export const PEN_WIDTH = 3
export const ERASER_WIDTH = 30
/** Thin, regular and thick pens. `InkTool.size` indexes this. */
export const PEN_SIZES = [1.5, PEN_WIDTH, 6] as const
/** On-screen minimums, so a page shrunk onto a phone still writes a visible line. */
const MIN_PEN_PX = 2
const MIN_ERASER_PX = 16

/**
 * Width for a new stroke, given how many screen pixels one page unit takes.
 * `undefined` means the default. The on-screen minimum scales with the pen, so
 * thin, regular and thick stay distinct on a small screen.
 */
export function strokeWidthFor(
  erase: boolean,
  pxPerUnit: number,
  penWidth: number = PEN_WIDTH,
): number | undefined {
  const base = erase ? ERASER_WIDTH : penWidth
  const needed = (erase ? MIN_ERASER_PX : (MIN_PEN_PX * penWidth) / PEN_WIDTH) / pxPerUnit
  if (needed > base) return roundCoord(needed)
  return erase || penWidth === PEN_WIDTH ? undefined : penWidth
}

/** One decimal of a page unit is far below a screen pixel and keeps saved pages small. */
export function roundCoord(value: number): number {
  return Math.round(value * 10) / 10
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: NotebookStroke,
  inks: readonly string[],
): void {
  const { points } = stroke
  if (points.length < 2) return

  ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over'
  const color = stroke.erase ? '#000' : (inks[stroke.ink] ?? inks[0])
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = stroke.width ?? (stroke.erase ? ERASER_WIDTH : PEN_WIDTH)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // A tap with no movement is still a mark — draw it as a dot.
  if (points.length === 2) {
    ctx.beginPath()
    ctx.arc(points[0], points[1], ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(points[0], points[1])
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1])
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: readonly NotebookStroke[],
  inks: readonly string[],
): void {
  for (const stroke of strokes) drawStroke(ctx, stroke, inks)
}

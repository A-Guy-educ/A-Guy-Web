'use client'

import { useEffect, useRef } from 'react'

import { NOTEBOOK_PAGE_WIDTH, type NotebookStroke } from '@/infra/types/notebook'
import { cn } from '@/infra/utils/ui'
import { useClaimPencilTouches } from '@/ui/web/notebook/stylus-touch'
import { strokeHitTester } from './lasso'
import { SNAP_HOLD_MS, SNAP_SLOP_PX, snapStroke, type SnappedShape } from './shape-snap'
import { drawStroke, drawStrokes, PEN_SIZES, roundCoord, strokeWidthFor } from './stroke-render'

export interface InkTool {
  ink: number
  mode: 'pen' | 'erase' | 'lasso'
  /** Index into `PEN_SIZES`. */
  size: number
  /** `area` rubs out what it passes over; `stroke` removes every stroke it touches. */
  eraser: 'area' | 'stroke'
}

/** How close (page units) the stroke eraser must pass to a stroke to remove it. */
const STROKE_ERASER_REACH = 8
/** On a small screen it reaches at least this many screen pixels. */
const STROKE_ERASER_MIN_PX = 10

interface InkSurfaceProps {
  height: number
  strokes: NotebookStroke[]
  inks: readonly string[]
  tool: InkTool
  /** When false a finger scrolls the notebook and only a stylus or mouse writes. */
  fingerDraws: boolean
  onStrokeEnd: (stroke: NotebookStroke) => void
  /** The stroke eraser removed strokes; this is what's left. */
  onStrokesErased: (remaining: NotebookStroke[]) => void
  className?: string
}

interface LiveStroke {
  pointerId: number
  pointerType: string
  stroke: NotebookStroke
  /**
   * Snapped to a shape by holding still. A line's end point keeps following
   * the pointer; a closed shape stays put until the pointer lifts.
   */
  snapped: SnappedShape | null
  /** Where the pointer last came to rest, in client pixels. */
  anchor: { x: number; y: number }
  holdTimer: number | null
}

interface StrokeErase {
  pointerId: number
  pointerType: string
  hits: ReturnType<typeof strokeHitTester>
  reach: number
  last: [number, number]
  removed: Set<number>
}

/**
 * Transparent drawing layer for one notebook page. Coordinates are kept in
 * page units (`NOTEBOOK_PAGE_WIDTH` wide) so a page drawn on a tablet renders
 * the same on a laptop. The in-progress stroke is drawn incrementally; the
 * full page is only redrawn when the saved strokes change (undo, load) or a
 * held stroke snaps to a shape.
 */
export function InkSurface({
  height,
  strokes,
  inks,
  tool,
  fingerDraws,
  onStrokeEnd,
  onStrokesErased,
  className,
}: InkSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const live = useRef<LiveStroke | null>(null)
  const strokeErase = useRef<StrokeErase | null>(null)
  // The hold timer fires outside render, so it reads the page through refs.
  const page = useRef({ height, strokes, inks })
  page.current = { height, strokes, inks }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = NOTEBOOK_PAGE_WIDTH * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawStrokes(ctx, strokes, inks)
  }, [height, strokes, inks])

  // iPadOS runs its long-press text selection and panning for the Pencil too;
  // only a non-passive touchstart preventDefault stops it (pointer events still
  // fire). Fingers are left alone unless they draw, so they keep scrolling.
  useClaimPencilTouches(canvasRef, fingerDraws)

  useEffect(() => () => clearHold(live.current), [])

  const redraw = (visible: readonly NotebookStroke[] = page.current.strokes) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, NOTEBOOK_PAGE_WIDTH, page.current.height)
    drawStrokes(ctx, visible, page.current.inks)
    if (live.current) drawStroke(ctx, live.current.stroke, page.current.inks)
  }

  const remaining = (removed: Set<number>) =>
    page.current.strokes.filter((_, index) => !removed.has(index))

  // Checks along the whole move, so a quick swipe can't skip over a thin stroke.
  const eraseAlong = (current: StrokeErase, x: number, y: number) => {
    const [fromX, fromY] = current.last
    const steps = Math.max(1, Math.ceil(Math.hypot(x - fromX, y - fromY) / current.reach))
    let changed = false
    for (let step = 1; step <= steps; step++) {
      const hits = current.hits(
        fromX + ((x - fromX) * step) / steps,
        fromY + ((y - fromY) * step) / steps,
        current.reach,
      )
      for (const index of hits) {
        if (current.removed.has(index)) continue
        current.removed.add(index)
        changed = true
      }
    }
    current.last = [x, y]
    if (changed) redraw(remaining(current.removed))
  }

  // A second finger landing means a pinch, not more writing: drop what the
  // first finger started.
  const cancelForPinch = () => {
    clearHold(live.current)
    live.current = null
    strokeErase.current = null
    redraw()
  }

  // Restarted whenever the pointer moves past the jitter slop, so it only
  // fires once the pen has actually rested.
  const armHold = (current: LiveStroke) => {
    clearHold(current)
    if (current.stroke.erase || current.snapped) return
    current.holdTimer = window.setTimeout(() => {
      current.holdTimer = null
      if (live.current !== current) return
      const snap = snapStroke(current.stroke.points)
      if (!snap) return
      current.stroke.points = snap.points
      current.snapped = snap.shape
      redraw()
    }, SNAP_HOLD_MS)
  }

  const toPage = (el: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect()
    const scale = NOTEBOOK_PAGE_WIDTH / rect.width
    return [roundCoord((clientX - rect.left) * scale), roundCoord((clientY - rect.top) * scale)]
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    const active = live.current ?? strokeErase.current
    if (active) {
      if (e.pointerType === 'touch' && active.pointerType === 'touch') cancelForPinch()
      return
    }
    if (e.pointerType === 'touch' && !fingerDraws) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const pxPerUnit = e.currentTarget.getBoundingClientRect().width / NOTEBOOK_PAGE_WIDTH

    if (tool.mode === 'erase' && tool.eraser === 'stroke') {
      const [x, y] = toPage(e.currentTarget, e.clientX, e.clientY)
      const current: StrokeErase = {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        hits: strokeHitTester(strokes),
        reach: Math.max(STROKE_ERASER_REACH, STROKE_ERASER_MIN_PX / pxPerUnit),
        last: [x, y],
        removed: new Set(),
      }
      strokeErase.current = current
      eraseAlong(current, x, y)
      return
    }

    const stroke: NotebookStroke = {
      ink: tool.ink,
      points: toPage(e.currentTarget, e.clientX, e.clientY),
    }
    const erase = tool.mode === 'erase'
    if (erase) stroke.erase = true
    const width = strokeWidthFor(erase, pxPerUnit, PEN_SIZES[tool.size])
    if (width !== undefined) stroke.width = width
    const current: LiveStroke = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      stroke,
      snapped: null,
      anchor: { x: e.clientX, y: e.clientY },
      holdTimer: null,
    }
    live.current = current
    armHold(current)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) drawStroke(ctx, stroke, inks)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const erasing = strokeErase.current
    if (erasing && erasing.pointerId === e.pointerId) {
      e.preventDefault()
      const events = e.nativeEvent.getCoalescedEvents?.() ?? []
      for (const sample of events.length ? events : [e.nativeEvent]) {
        const [x, y] = toPage(e.currentTarget, sample.clientX, sample.clientY)
        eraseAlong(erasing, x, y)
      }
      return
    }
    const current = live.current
    if (!current || current.pointerId !== e.pointerId) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    const events = e.nativeEvent.getCoalescedEvents?.() ?? []
    const samples = events.length ? events : [e.nativeEvent]
    const last = samples[samples.length - 1]

    if (current.snapped && current.snapped !== 'line') return
    if (current.snapped === 'line') {
      const [x0, y0] = current.stroke.points
      current.stroke.points = [x0, y0, ...toPage(e.currentTarget, last.clientX, last.clientY)]
      redraw()
      return
    }
    if (
      Math.hypot(last.clientX - current.anchor.x, last.clientY - current.anchor.y) > SNAP_SLOP_PX
    ) {
      current.anchor = { x: last.clientX, y: last.clientY }
      armHold(current)
    }

    for (const sample of samples) {
      const [x, y] = toPage(e.currentTarget, sample.clientX, sample.clientY)
      const { points } = current.stroke
      const segment = { ...current.stroke, points: [points.at(-2)!, points.at(-1)!, x, y] }
      points.push(x, y)
      if (ctx) drawStroke(ctx, segment, inks)
    }
  }

  const finish = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const erasing = strokeErase.current
    if (erasing && erasing.pointerId === e.pointerId) {
      strokeErase.current = null
      if (erasing.removed.size) onStrokesErased(remaining(erasing.removed))
      return
    }
    const current = live.current
    if (!current || current.pointerId !== e.pointerId) return
    clearHold(current)
    live.current = null
    onStrokeEnd(current.stroke)
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 h-full w-full select-none', className)}
      style={{ touchAction: fingerDraws ? 'none' : 'pan-x pan-y', WebkitTouchCallout: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
    />
  )
}

function clearHold(current: LiveStroke | null) {
  if (current?.holdTimer != null) window.clearTimeout(current.holdTimer)
  if (current) current.holdTimer = null
}

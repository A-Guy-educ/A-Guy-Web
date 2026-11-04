'use client'

import { useEffect, useRef } from 'react'

import { NOTEBOOK_PAGE_WIDTH, type NotebookStroke } from '@/infra/types/notebook'
import { cn } from '@/infra/utils/ui'
import { isStylusTouch } from '@/ui/web/notebook/stylus-touch'
import { STRAIGHTEN_HOLD_MS, STRAIGHTEN_SLOP_PX, straightenStroke } from './straighten'
import { drawStroke, drawStrokes, roundCoord, strokeWidthFor } from './stroke-render'

export interface InkTool {
  ink: number
  erase: boolean
}

interface InkSurfaceProps {
  height: number
  strokes: NotebookStroke[]
  inks: readonly string[]
  tool: InkTool
  /** When false a finger scrolls the notebook and only a stylus or mouse writes. */
  fingerDraws: boolean
  onStrokeEnd: (stroke: NotebookStroke) => void
  className?: string
}

interface LiveStroke {
  pointerId: number
  stroke: NotebookStroke
  /** Snapped to a line by holding still; further moves only drag the end point. */
  straight: boolean
  /** Where the pointer last came to rest, in client pixels. */
  anchor: { x: number; y: number }
  holdTimer: number | null
}

/**
 * Transparent drawing layer for one notebook page. Coordinates are kept in
 * page units (`NOTEBOOK_PAGE_WIDTH` wide) so a page drawn on a tablet renders
 * the same on a laptop. The in-progress stroke is drawn incrementally; the
 * full page is only redrawn when the saved strokes change (undo, load) or a
 * held stroke snaps to a straight line.
 */
export function InkSurface({
  height,
  strokes,
  inks,
  tool,
  fingerDraws,
  onStrokeEnd,
  className,
}: InkSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const live = useRef<LiveStroke | null>(null)
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
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const block = (e: TouchEvent) => {
      if (fingerDraws || isStylusTouch(e)) e.preventDefault()
    }
    canvas.addEventListener('touchstart', block, { passive: false })
    return () => canvas.removeEventListener('touchstart', block)
  }, [fingerDraws])

  useEffect(() => () => clearHold(live.current), [])

  const redraw = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, NOTEBOOK_PAGE_WIDTH, page.current.height)
    drawStrokes(ctx, page.current.strokes, page.current.inks)
    if (live.current) drawStroke(ctx, live.current.stroke, page.current.inks)
  }

  // Restarted whenever the pointer moves past the jitter slop, so it only
  // fires once the pen has actually rested.
  const armHold = (current: LiveStroke) => {
    clearHold(current)
    if (current.stroke.erase || current.straight) return
    current.holdTimer = window.setTimeout(() => {
      current.holdTimer = null
      if (live.current !== current) return
      const line = straightenStroke(current.stroke.points)
      if (!line) return
      current.stroke.points = line
      current.straight = true
      redraw()
    }, STRAIGHTEN_HOLD_MS)
  }

  const toPage = (el: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect()
    const scale = NOTEBOOK_PAGE_WIDTH / rect.width
    return [roundCoord((clientX - rect.left) * scale), roundCoord((clientY - rect.top) * scale)]
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || live.current) return
    if (e.pointerType === 'touch' && !fingerDraws) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const stroke: NotebookStroke = {
      ink: tool.ink,
      points: toPage(e.currentTarget, e.clientX, e.clientY),
    }
    if (tool.erase) stroke.erase = true
    const pxPerUnit = e.currentTarget.getBoundingClientRect().width / NOTEBOOK_PAGE_WIDTH
    const width = strokeWidthFor(tool.erase, pxPerUnit)
    if (width !== undefined) stroke.width = width
    const current: LiveStroke = {
      pointerId: e.pointerId,
      stroke,
      straight: false,
      anchor: { x: e.clientX, y: e.clientY },
      holdTimer: null,
    }
    live.current = current
    armHold(current)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) drawStroke(ctx, stroke, inks)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const current = live.current
    if (!current || current.pointerId !== e.pointerId) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    const events = e.nativeEvent.getCoalescedEvents?.() ?? []
    const samples = events.length ? events : [e.nativeEvent]
    const last = samples[samples.length - 1]

    if (current.straight) {
      const [x0, y0] = current.stroke.points
      current.stroke.points = [x0, y0, ...toPage(e.currentTarget, last.clientX, last.clientY)]
      redraw()
      return
    }
    if (
      Math.hypot(last.clientX - current.anchor.x, last.clientY - current.anchor.y) >
      STRAIGHTEN_SLOP_PX
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
      style={{ touchAction: fingerDraws ? 'none' : 'pan-y', WebkitTouchCallout: 'none' }}
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

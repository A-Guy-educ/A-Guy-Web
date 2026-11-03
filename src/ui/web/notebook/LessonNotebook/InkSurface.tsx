'use client'

import { useEffect, useRef } from 'react'

import { NOTEBOOK_PAGE_WIDTH, type NotebookStroke } from '@/infra/types/notebook'
import { cn } from '@/infra/utils/ui'
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

/**
 * Transparent drawing layer for one notebook page. Coordinates are kept in
 * page units (`NOTEBOOK_PAGE_WIDTH` wide) so a page drawn on a tablet renders
 * the same on a laptop. The in-progress stroke is drawn incrementally; the
 * full page is only redrawn when the saved strokes change (undo, load).
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
  const live = useRef<{ pointerId: number; stroke: NotebookStroke } | null>(null)

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
    live.current = { pointerId: e.pointerId, stroke }
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
    live.current = null
    onStrokeEnd(current.stroke)
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 h-full w-full', className)}
      style={{ touchAction: fingerDraws ? 'none' : 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
    />
  )
}

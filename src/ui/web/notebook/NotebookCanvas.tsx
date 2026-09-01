'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { NotebookStroke } from './useNotebook'

interface NotebookCanvasProps {
  strokes: NotebookStroke[]
  onStrokeComplete: (stroke: NotebookStroke) => void
  color: string
  size: number
}

/**
 * Handwritten-drawing surface for the notebook drawer.
 *
 * Uses pointer events (unified mouse / touch / pen), captures the pointer
 * so drags off-canvas still finalise cleanly, and redraws from the strokes
 * array on every change so undo/clear work without a canvas-level history.
 * `touch-action: none` on the canvas prevents mobile page scroll while the
 * student is writing.
 */
export function NotebookCanvas({ strokes, onStrokeComplete, color, size }: NotebookCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeStrokeRef = useRef<NotebookStroke | null>(null)
  const drawingRef = useRef(false)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const s of strokes) drawStroke(ctx, s)
    if (activeStrokeRef.current) drawStroke(ctx, activeStrokeRef.current)
  }, [strokes])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
      redraw()
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [redraw])

  useEffect(() => {
    redraw()
  }, [strokes, redraw])

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawingRef.current = true
    activeStrokeRef.current = { color, size, points: [getPoint(e)] }
    redraw()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !activeStrokeRef.current) return
    activeStrokeRef.current.points.push(getPoint(e))
    redraw()
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !activeStrokeRef.current) return
    canvasRef.current?.releasePointerCapture(e.pointerId)
    drawingRef.current = false
    const completed = activeStrokeRef.current
    activeStrokeRef.current = null
    // Drop taps (single point) — they render as invisible dots and clutter
    // the persisted strokes array.
    if (completed.points.length > 1) onStrokeComplete(completed)
    else redraw()
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-white">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="block touch-none cursor-crosshair"
      />
    </div>
  )
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: NotebookStroke) {
  if (stroke.points.length === 0) return
  ctx.beginPath()
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.size
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
  }
  ctx.stroke()
}

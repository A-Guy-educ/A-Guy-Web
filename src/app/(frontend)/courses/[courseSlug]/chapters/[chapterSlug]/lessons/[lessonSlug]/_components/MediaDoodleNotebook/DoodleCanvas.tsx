'use client'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { Eraser, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Mirrors AskDrawingCanvas' palette resolution so the doodle pad stays
// on-theme in dark mode / brand overrides. Blue / red / black.
const FALLBACK_PEN_COLORS = ['#2563eb', '#ef4444', '#000000']
const PEN_INK_VARS = ['--pen-ink-3', '--pen-ink-2', '--pen-ink-1'] as const
const PEN_WIDTH = 2.5
const ERASER_WIDTH = 18

interface DoodleCanvasProps {
  className?: string
}

export function DoodleCanvas({ className }: DoodleCanvasProps) {
  const t = useTranslations('courses.doodleNotebook')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const [penColors, setPenColors] = useState<string[]>(FALLBACK_PEN_COLORS)
  const [selectedColor, setSelectedColor] = useState<string>(FALLBACK_PEN_COLORS[0])
  const [isErasing, setIsErasing] = useState(false)
  const selectedColorRef = useRef(selectedColor)
  const isErasingRef = useRef(isErasing)

  useEffect(() => {
    selectedColorRef.current = selectedColor
  }, [selectedColor])
  useEffect(() => {
    isErasingRef.current = isErasing
  }, [isErasing])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const style = getComputedStyle(document.documentElement)
    const resolved = PEN_INK_VARS.map((v, i) => {
      const raw = style.getPropertyValue(v).trim()
      return raw ? `hsl(${raw})` : FALLBACK_PEN_COLORS[i]
    })
    setPenColors(resolved)
    setSelectedColor((prev) => (resolved.includes(prev) ? prev : resolved[0]))
  }, [])

  const applyStroke = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    if (isErasingRef.current) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = ERASER_WIDTH
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = selectedColorRef.current
      ctx.lineWidth = PEN_WIDTH
    }
  }, [])

  // Snapshot-preserving resize — the panel is draggable + foldable so the
  // canvas container frequently reflows. Without this the student's work
  // vanishes every time the parent size changes.
  const initOrResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const nextW = canvas.offsetWidth
    const nextH = canvas.offsetHeight
    if (nextW === 0 || nextH === 0) return
    if (canvas.width === nextW && canvas.height === nextH) return

    const oldCtx = canvas.getContext('2d')
    const oldData =
      oldCtx && canvas.width > 0 && canvas.height > 0
        ? oldCtx.getImageData(0, 0, canvas.width, canvas.height)
        : null

    canvas.width = nextW
    canvas.height = nextH
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctxRef.current = ctx
    applyStroke()
    if (oldData) ctx.putImageData(oldData, 0, 0)
  }, [applyStroke])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const timer = setTimeout(initOrResize, 50)
    const observer = new ResizeObserver(initOrResize)
    observer.observe(canvas)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [initOrResize])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true
    lastPos.current = getPos(e)
    applyStroke()
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !ctxRef.current) return
    const pos = getPos(e)
    ctxRef.current.beginPath()
    ctxRef.current.moveTo(lastPos.current.x, lastPos.current.y)
    ctxRef.current.lineTo(pos.x, pos.y)
    ctxRef.current.stroke()
    lastPos.current = pos
  }

  const stopDraw = () => {
    isDrawing.current = false
  }

  const clearAll = () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  const pickColor = (color: string) => {
    setIsErasing(false)
    setSelectedColor(color)
  }

  return (
    <div className={cn('flex flex-col min-h-0 h-full', className)}>
      <div className="flex items-center justify-between gap-content-gap-xs px-3 py-2 border-b border-border/60 bg-muted/40 shrink-0">
        <div className="flex gap-content-gap-xs" dir="ltr">
          {penColors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pickColor(c)}
              className={cn(
                'w-5 h-5 rounded-full border transition-transform hover:scale-110',
                selectedColor === c && !isErasing ? 'border-foreground border-2' : 'border-border',
              )}
              style={{ backgroundColor: c }}
              aria-label={`${t('color')} ${c}`}
            />
          ))}
          <button
            type="button"
            onClick={() => setIsErasing(true)}
            aria-label={t('eraser')}
            className={cn(
              'w-5 h-5 rounded-full border flex items-center justify-center transition-transform hover:scale-110 bg-background',
              isErasing ? 'border-foreground border-2' : 'border-border',
            )}
          >
            <Eraser className="w-3 h-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-body-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-normal"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t('clear')}</span>
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
        className={cn(
          'flex-1 min-h-0 w-full touch-none bg-background',
          isErasing ? 'cursor-cell' : 'cursor-crosshair',
        )}
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.6) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
    </div>
  )
}

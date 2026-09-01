'use client'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Fallback hex swatches used when the `--pen-ink-*` design tokens can't
// be resolved (SSR, older browsers, missing tokens). Real strokes read
// from `getComputedStyle(document.documentElement)` at mount so the
// palette stays in the design system and re-tints with dark mode / brand
// themes. Ordered blue / red / black to match the original UI.
const FALLBACK_PEN_COLORS = ['#2563eb', '#ef4444', '#000000']
const PEN_INK_VARS = ['--pen-ink-3', '--pen-ink-2', '--pen-ink-1'] as const
const CANVAS_HEIGHT = 300

interface AskDrawingCanvasProps {
  onCheckSolution: (imageData: string) => void | Promise<void>
}

export function AskDrawingCanvas({ onCheckSolution }: AskDrawingCanvasProps) {
  const t = useTranslations('homepage.ask')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  // Guards against rapid double-taps racing past `disabled={isChecking}`.
  // React batches sync setState so the button never actually disables
  // between clicks fired in the same event tick.
  const submittingRef = useRef(false)
  const [isChecking, setIsChecking] = useState(false)
  const [penColors, setPenColors] = useState<string[]>(FALLBACK_PEN_COLORS)
  const [selectedColor, setSelectedColor] = useState<string>(FALLBACK_PEN_COLORS[0])

  // Resolve pen inks from CSS vars once on mount so canvas strokes match
  // the current theme instead of the hardcoded fallback hex triple.
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

  // Snapshot-preserving canvas init / resize. The bare `AskDrawingCanvas`
  // sized itself once via `setTimeout(initCanvas, 100)`, so orientation
  // changes and mobile-keyboard show/hide left the CSS width out of sync
  // with the internal buffer — new strokes landed at wrong buffer coords.
  // Now we ResizeObserver the canvas, and on every size delta we
  // snapshot the existing pixels (getImageData → putImageData) so the
  // student's in-progress work survives the reflow.
  const initOrResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const nextWidth = canvas.offsetWidth
    if (nextWidth === 0) return
    if (canvas.width === nextWidth && canvas.height === CANVAS_HEIGHT) return

    // Preserve current drawing if the buffer had valid dimensions.
    const oldCtx = canvas.getContext('2d')
    const oldData =
      oldCtx && canvas.width > 0 && canvas.height > 0
        ? oldCtx.getImageData(0, 0, canvas.width, canvas.height)
        : null

    canvas.width = nextWidth
    canvas.height = CANVAS_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineCap = 'round'
    ctx.lineWidth = 3
    ctx.strokeStyle = selectedColor
    ctxRef.current = ctx
    if (oldData) ctx.putImageData(oldData, 0, 0)
  }, [selectedColor])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Kick an initial size in case the observer doesn't fire quickly.
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

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !ctxRef.current) return
    const pos = getPos(e)
    ctxRef.current.beginPath()
    ctxRef.current.moveTo(lastPos.current.x, lastPos.current.y)
    ctxRef.current.lineTo(pos.x, pos.y)
    ctxRef.current.stroke()
    lastPos.current = pos
  }

  const clearCanvas = () => {
    if (ctxRef.current && canvasRef.current) {
      ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  const handleCheck = async () => {
    if (!canvasRef.current || submittingRef.current) return
    submittingRef.current = true
    setIsChecking(true)
    try {
      const imageData = canvasRef.current.toDataURL('image/png')
      await onCheckSolution(imageData)
    } finally {
      submittingRef.current = false
      setIsChecking(false)
    }
  }

  const setColor = (color: string) => {
    setSelectedColor(color)
    if (ctxRef.current) ctxRef.current.strokeStyle = color
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true
    lastPos.current = getPos(e)
  }

  const stopDraw = () => {
    isDrawing.current = false
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl overflow-hidden border-2 border-border bg-background">
        <div className="p-3 border-b border-border bg-muted flex justify-between items-center">
          <div className="flex gap-content-gap-xs">
            {penColors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'w-6 h-6 rounded-full border transition-transform hover:scale-110',
                  selectedColor === c ? 'border-foreground border-2' : 'border-border',
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-normal"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('clearCanvas')}</span>
            </button>
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="px-4 py-1.5 rounded-lg text-body-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-normal disabled:opacity-50"
            >
              {isChecking ? t('checking') : t('checkSolution')}
            </button>
          </div>
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
          className="w-full h-[300px] cursor-crosshair touch-none bg-background"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>
    </div>
  )
}

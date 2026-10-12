'use client'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { Check, Eraser, Trash2 } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Mirrors AskDrawingCanvas' palette resolution so the doodle pad stays
// on-theme in dark mode / brand overrides. Blue / red / black.
const FALLBACK_PEN_COLORS = ['#2563eb', '#ef4444', '#000000']
const PEN_INK_VARS = ['--pen-ink-3', '--pen-ink-2', '--pen-ink-1'] as const
const PEN_WIDTH = 2.5
const ERASER_WIDTH = 18

export interface DoodleCanvasHandle {
  /**
   * Returns the current canvas contents as a PNG data URL, or `null` if the
   * canvas hasn't been laid out yet (parent still measuring, folded, etc.).
   */
  getImageData: () => string | null
}

interface DoodleCanvasProps {
  className?: string
  /**
   * If provided, renders a check (✓) button in the toolbar that, when
   * clicked, calls back with the current canvas as a PNG data URL. Omit
   * this prop to render the canvas as a plain scratchpad (lesson media
   * tab behavior).
   */
  onCheck?: (imageData: string) => void
  /**
   * Disables the check button (e.g. while a check request is in flight).
   */
  checkDisabled?: boolean
}

export const DoodleCanvas = forwardRef<DoodleCanvasHandle, DoodleCanvasProps>(function DoodleCanvas(
  { className, onCheck, checkDisabled },
  ref,
) {
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

  useImperativeHandle(
    ref,
    () => ({
      getImageData: () => {
        const canvas = canvasRef.current
        if (!canvas || canvas.width === 0 || canvas.height === 0) return null
        return canvas.toDataURL('image/png')
      },
    }),
    [],
  )

  const handleCheck = () => {
    if (!onCheck || checkDisabled) return
    const canvas = canvasRef.current
    if (!canvas || canvas.width === 0 || canvas.height === 0) return
    onCheck(canvas.toDataURL('image/png'))
  }

  return (
    <div className={cn('flex flex-col min-h-0 h-full', className)}>
      <div className="flex items-center justify-between gap-content-gap-xs px-3 py-2 border-b border-border/60 bg-muted/40 shrink-0">
        <div className="flex items-center gap-content-gap-xs" dir="ltr">
          {penColors.map((c) => {
            const isActive = selectedColor === c && !isErasing
            return (
              <button
                key={c}
                type="button"
                onClick={() => pickColor(c)}
                title={`${t('color')} ${c}`}
                aria-label={`${t('color')} ${c}`}
                aria-pressed={isActive}
                className={cn(
                  'relative w-6 h-6 rounded-full border transition-all hover:scale-110',
                  isActive
                    ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground border-transparent scale-110'
                    : 'border-border/60',
                )}
                style={{ backgroundColor: c }}
              />
            )
          })}
          <button
            type="button"
            onClick={() => setIsErasing(true)}
            title={t('eraser')}
            aria-label={t('eraser')}
            aria-pressed={isErasing}
            className={cn(
              'w-6 h-6 rounded-full border flex items-center justify-center transition-all hover:scale-110 bg-background',
              isErasing
                ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground border-transparent scale-110'
                : 'border-border/60',
            )}
          >
            <Eraser className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-content-gap-xs">
          {onCheck && (
            <button
              type="button"
              onClick={handleCheck}
              disabled={checkDisabled}
              title={t('check')}
              aria-label={t('check')}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-body-xs bg-success/10 text-success hover:bg-success/20 transition-colors duration-normal disabled:opacity-40 disabled:hover:bg-success/10"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('check')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-body-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-normal"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('clear')}</span>
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
        className={cn(
          'flex-1 min-h-0 w-full touch-none bg-background',
          isErasing ? 'cursor-cell' : 'cursor-crosshair',
        )}
        style={{
          // Math-notebook grid ("מחברת משבצות"): 1px minor lines every 20px
          // and bolder 1.5px major lines every 5 cells (100px).
          //
          // Uses `--foreground` (not `--border` / `--muted-foreground`) so the
          // grid is guaranteed to contrast against `--background` in both
          // light and dark modes — the earlier `--border`-based styles were
          // nearly identical to the canvas background and visibly disappeared.
          // Opacity is kept low so handwriting still reads as the dominant
          // mark on the page.
          backgroundImage: [
            'linear-gradient(hsl(var(--foreground) / 0.12) 1px, transparent 1px)',
            'linear-gradient(90deg, hsl(var(--foreground) / 0.12) 1px, transparent 1px)',
            'linear-gradient(hsl(var(--foreground) / 0.3) 1.5px, transparent 1.5px)',
            'linear-gradient(90deg, hsl(var(--foreground) / 0.3) 1.5px, transparent 1.5px)',
          ].join(', '),
          backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px',
        }}
      />
    </div>
  )
})

'use client'

/**
 * MediaDoodleNotebook
 *
 * Floating scratch-paper panel for media-only lessons. Students can doodle
 * calculations while reading the lesson media (PDF/image). The panel is
 * draggable; dragging its header past the top of its container folds it
 * into a thin tab at the top edge. Dragging the tab back down (or clicking
 * it) restores the full panel at its last position.
 *
 * No persistence / submission — this is a short-lived scratchpad per lesson
 * view, matching the request to "just doodle and erase, no checking yet."
 */

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { ChevronDown, GripVertical, NotebookPen } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { DoodleCanvas } from './DoodleCanvas'

const FOLD_THRESHOLD_PX = 24
const UNFOLD_DRAG_PX = 60
const DEFAULT_SIZE = { w: 320, h: 260 }
const MIN_MARGIN = 8

interface Position {
  x: number
  y: number
}

interface MediaDoodleNotebookProps {
  /** Positioning anchor — the component is `absolute` and sized against this parent. */
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function MediaDoodleNotebook({ containerRef }: MediaDoodleNotebookProps) {
  const t = useTranslations('courses.doodleNotebook')
  const [isFolded, setIsFolded] = useState(false)
  const [pos, setPos] = useState<Position>({ x: MIN_MARGIN, y: 180 })
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
    startY: number
    moved: boolean
  } | null>(null)

  // Seed initial position once we know the container size — bottom-start,
  // RTL-aware (reads `dir` from the container's chain so we don't need to
  // thread the locale through).
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const panelW = panelRef.current?.offsetWidth ?? DEFAULT_SIZE.w
    const panelH = panelRef.current?.offsetHeight ?? DEFAULT_SIZE.h
    const isRTL =
      getComputedStyle(container).direction === 'rtl' || document.documentElement.dir === 'rtl'
    setPos({
      x: isRTL ? rect.width - panelW - MIN_MARGIN : MIN_MARGIN,
      y: Math.max(MIN_MARGIN, rect.height - panelH - MIN_MARGIN),
    })
    // Container size is read from a ref; parent lifecycle handles its own
    // resize. We only need to seed on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clampToContainer = useCallback(
    (next: Position): Position => {
      const container = containerRef.current
      const panel = panelRef.current
      if (!container || !panel) return next
      const cRect = container.getBoundingClientRect()
      const maxX = Math.max(MIN_MARGIN, cRect.width - panel.offsetWidth - MIN_MARGIN)
      const maxY = Math.max(MIN_MARGIN, cRect.height - panel.offsetHeight - MIN_MARGIN)
      return {
        x: Math.min(Math.max(-panel.offsetWidth + 64, next.x), maxX),
        y: Math.min(Math.max(0, next.y), maxY),
      }
    },
    [containerRef],
  )

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== undefined && e.button !== 0) return
    const panel = panelRef.current
    if (!panel) return
    const panelRect = panel.getBoundingClientRect()
    dragStateRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - panelRect.left,
      offsetY: e.clientY - panelRect.top,
      startY: pos.y,
      moved: false,
    }
    try {
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch {
      // Some browsers reject capture on synthetic pointer types — safe to ignore.
    }
  }

  const onHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current
    if (!state || state.pointerId !== e.pointerId) return
    const container = containerRef.current
    if (!container) return
    const cRect = container.getBoundingClientRect()
    const nextX = e.clientX - cRect.left - state.offsetX
    const nextY = e.clientY - cRect.top - state.offsetY
    if (!state.moved && (Math.abs(nextX - pos.x) > 2 || Math.abs(nextY - pos.y) > 2)) {
      state.moved = true
    }
    setPos(clampToContainer({ x: nextX, y: nextY }))
  }

  const onHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current
    if (!state || state.pointerId !== e.pointerId) return
    dragStateRef.current = null
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore — capture may have been lost mid-drag
    }

    // Fold if the user dragged near the top edge of the container.
    if (!isFolded && pos.y <= FOLD_THRESHOLD_PX) {
      setIsFolded(true)
      setPos((p) => ({ ...p, y: 0 }))
      return
    }

    // Unfold if the folded tab was dragged downward past the threshold.
    if (isFolded && state.moved && pos.y >= UNFOLD_DRAG_PX) {
      setIsFolded(false)
      return
    }
  }

  const toggleFold = () => {
    setIsFolded((prev) => {
      const next = !prev
      if (next) setPos((p) => ({ ...p, y: 0 }))
      else setPos((p) => ({ ...p, y: Math.max(80, p.y) }))
      return next
    })
  }

  const width = DEFAULT_SIZE.w
  const height = isFolded ? 36 : DEFAULT_SIZE.h

  return (
    <div
      ref={panelRef}
      dir="ltr"
      className={cn(
        'absolute z-30 select-none bg-card border border-border rounded-lg shadow-elevation-3 overflow-hidden flex flex-col',
        'transition-[height] duration-fast ease-out',
      )}
      style={{ left: pos.x, top: pos.y, width, height }}
      role="dialog"
      aria-label={t('title')}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
        className={cn(
          'flex items-center justify-between gap-content-gap-xs px-2 py-1.5 bg-muted/80 border-b border-border/60 cursor-grab active:cursor-grabbing touch-none',
          isFolded && 'border-b-0',
        )}
      >
        <div className="flex items-center gap-content-gap-xs text-body-sm font-medium text-foreground min-w-0">
          <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
          <NotebookPen className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="truncate">{t('title')}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleFold()
          }}
          aria-label={isFolded ? t('expand') : t('collapse')}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-background/60 transition-colors text-muted-foreground"
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', isFolded && 'rotate-180')} />
        </button>
      </div>
      {!isFolded && <DoodleCanvas className="flex-1" />}
    </div>
  )
}

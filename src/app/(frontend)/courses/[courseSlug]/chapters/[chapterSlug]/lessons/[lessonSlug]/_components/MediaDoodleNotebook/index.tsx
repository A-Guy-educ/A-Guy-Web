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
import { NotebookPen, Pencil, Type } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { DoodleCanvas } from './DoodleCanvas'
import { DoodleTextArea } from './DoodleTextArea'

type NotebookMode = 'pen' | 'text'

const FOLD_THRESHOLD_PX = 24
const UNFOLD_DRAG_PX = 60
const DEFAULT_SIZE = { w: 320, h: 260 }
const MIN_SIZE = { w: 220, h: 180 }
const FOLDED_HEIGHT = 36
const MIN_MARGIN = 8

interface Position {
  x: number
  y: number
}

interface Size {
  w: number
  h: number
}

interface MediaDoodleNotebookProps {
  /** Positioning anchor — the component is `absolute` and sized against this parent. */
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function MediaDoodleNotebook({ containerRef }: MediaDoodleNotebookProps) {
  const t = useTranslations('courses.doodleNotebook')
  const [isFolded, setIsFolded] = useState(false)
  const [pos, setPos] = useState<Position>({ x: MIN_MARGIN, y: 180 })
  const [size, setSize] = useState<Size>(DEFAULT_SIZE)
  const [isRTL, setIsRTL] = useState(false)
  const [mode, setMode] = useState<NotebookMode>('text')
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
    startY: number
    moved: boolean
  } | null>(null)
  const resizeStateRef = useRef<{
    pointerId: number
    startClientX: number
    startClientY: number
    startW: number
    startH: number
    startPosX: number
  } | null>(null)

  // Seed initial position once we know the container size — bottom-start,
  // RTL-aware (reads `dir` from the container's chain so we don't need to
  // thread the locale through). Also captures the RTL flag for the resize
  // handle, which lives on opposite corners between LTR and RTL.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const panelW = panelRef.current?.offsetWidth ?? DEFAULT_SIZE.w
    const panelH = panelRef.current?.offsetHeight ?? DEFAULT_SIZE.h
    const rtl =
      getComputedStyle(container).direction === 'rtl' || document.documentElement.dir === 'rtl'
    setIsRTL(rtl)
    setPos({
      x: rtl ? rect.width - panelW - MIN_MARGIN : MIN_MARGIN,
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

  // Resize corner. The handle lives at the bottom-right in LTR and the
  // bottom-left in RTL (whichever is the "outer" bottom corner relative to
  // the start-anchored panel), so RTL resize grows westward and must also
  // move `pos.x` to keep the opposite edge pinned.
  const onResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== undefined && e.button !== 0) return
    e.stopPropagation()
    resizeStateRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startW: size.w,
      startH: size.h,
      startPosX: pos.x,
    }
    try {
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch {
      // See drag handler — some pointer types reject capture; drag still works.
    }
  }

  const onResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = resizeStateRef.current
    if (!state || state.pointerId !== e.pointerId) return
    const container = containerRef.current
    if (!container) return
    e.stopPropagation()
    const cRect = container.getBoundingClientRect()
    const dx = e.clientX - state.startClientX
    const dy = e.clientY - state.startClientY

    if (isRTL) {
      // Handle at bottom-left: width grows as pointer moves left (negative dx).
      const nextW = Math.max(MIN_SIZE.w, state.startW - dx)
      const nextX = state.startPosX + dx
      const maxW = state.startW + (state.startPosX - MIN_MARGIN)
      const clampedW = Math.min(nextW, maxW)
      const clampedX = Math.max(MIN_MARGIN, nextX - (clampedW - (state.startW - dx)))
      const nextH = Math.max(
        MIN_SIZE.h,
        Math.min(state.startH + dy, cRect.height - pos.y - MIN_MARGIN),
      )
      setSize({ w: clampedW, h: nextH })
      setPos((p) => ({ ...p, x: clampedX }))
    } else {
      // Handle at bottom-right: both dimensions grow with pointer movement.
      const maxW = cRect.width - pos.x - MIN_MARGIN
      const maxH = cRect.height - pos.y - MIN_MARGIN
      const nextW = Math.max(MIN_SIZE.w, Math.min(state.startW + dx, maxW))
      const nextH = Math.max(MIN_SIZE.h, Math.min(state.startH + dy, maxH))
      setSize({ w: nextW, h: nextH })
    }
  }

  const onResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = resizeStateRef.current
    if (!state || state.pointerId !== e.pointerId) return
    resizeStateRef.current = null
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const width = size.w
  const height = isFolded ? FOLDED_HEIGHT : size.h

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
          <NotebookPen className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="truncate">{t('title')}</span>
        </div>
        {!isFolded && (
          <div
            className="flex items-center rounded-md border border-border/60 bg-background/60 p-0.5"
            // The segmented toggle lives inside the drag header. Stop the
            // pointer events here from reaching the drag handler so clicking
            // a mode doesn't start a drag + swallow the click.
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMode('pen')}
              aria-label={t('penMode')}
              aria-pressed={mode === 'pen'}
              title={t('penMode')}
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded transition-colors duration-normal',
                mode === 'pen'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              aria-label={t('textMode')}
              aria-pressed={mode === 'text'}
              title={t('textMode')}
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded transition-colors duration-normal',
                mode === 'text'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Type className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      {!isFolded && mode === 'pen' && <DoodleCanvas className="flex-1" />}
      {!isFolded && mode === 'text' && <DoodleTextArea className="flex-1" />}
      {!isFolded && (
        <div
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
          role="separator"
          aria-label={t('resize')}
          aria-orientation="vertical"
          className={cn(
            'absolute bottom-0 w-5 h-5 flex items-end justify-end touch-none z-10',
            isRTL ? 'left-0 cursor-nesw-resize' : 'right-0 cursor-nwse-resize',
          )}
          style={{
            background: isRTL
              ? 'linear-gradient(45deg, transparent 50%, hsl(var(--muted-foreground) / 0.4) 50%, hsl(var(--muted-foreground) / 0.4) 60%, transparent 60%)'
              : 'linear-gradient(-45deg, transparent 50%, hsl(var(--muted-foreground) / 0.4) 50%, hsl(var(--muted-foreground) / 0.4) 60%, transparent 60%)',
          }}
        />
      )}
    </div>
  )
}

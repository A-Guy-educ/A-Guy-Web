'use client'

/**
 * CutSelection
 *
 * Draws the student's cut selection over the lesson material and, once the
 * drag ends, offers to send it to the notebook or the chat. It does not
 * capture pointer input itself — the selection comes from
 * `useIframeCutSelection`, so the material underneath stays scrollable.
 */

import { Loader2, MessageCircle, NotebookPen, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useTranslations } from '@/ui/web/providers/I18n'

export type CutTarget = 'notebook' | 'chat'

export interface ViewportBox {
  left: number
  top: number
  width: number
  height: number
}

interface CutSelectionProps {
  box: ViewportBox | null
  dragging: boolean
  busy: boolean
  onCut: (target: CutTarget, selection: ViewportBox) => void
  onClear: () => void
}

/** Rough size of the action pill, enough to keep it on screen. */
const ACTIONS_HALF_WIDTH = 150
const ACTIONS_HEIGHT = 44
const GAP = 8

/**
 * Below the selection when it fits, else above it, else inside its bottom
 * edge; horizontally centred but never past the layer's edges. A cut near the
 * bottom of a phone screen would otherwise put the buttons out of reach.
 */
export function placeActions(
  local: { left: number; top: number },
  box: ViewportBox,
  layer: DOMRect,
): { left: number; top: number } {
  const below = local.top + box.height + GAP
  const above = local.top - GAP - ACTIONS_HEIGHT
  const top =
    below + ACTIONS_HEIGHT <= layer.height
      ? below
      : above >= 0
        ? above
        : Math.max(0, Math.min(layer.height, local.top + box.height) - ACTIONS_HEIGHT - GAP)
  const centre = local.left + box.width / 2
  const left =
    layer.width <= ACTIONS_HALF_WIDTH * 2
      ? layer.width / 2
      : Math.min(layer.width - ACTIONS_HALF_WIDTH, Math.max(ACTIONS_HALF_WIDTH, centre))
  return { left, top }
}

export function CutSelection({ box, dragging, busy, onCut, onClear }: CutSelectionProps) {
  const t = useTranslations('courses.lessonNotebook')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClear()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClear])

  // The layer is positioned in its container; the box arrives in viewport coordinates.
  const origin = ref.current?.getBoundingClientRect()
  const local = box && origin ? { left: box.left - origin.left, top: box.top - origin.top } : null
  const actions = box && local && origin ? placeActions(local, box, origin) : null

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {box && local && (
        <div
          className="absolute border-2 border-dashed border-primary bg-primary/10"
          style={{ ...local, width: box.width, height: box.height }}
        />
      )}
      {box && actions && !dragging && (
        <div
          className="pointer-events-auto absolute flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card p-1 shadow-elevation-3"
          style={actions}
        >
          {busy ? (
            <Loader2 className="m-2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <button
                type="button"
                onClick={() => onCut('notebook', box)}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-body-xs text-primary-foreground hover:bg-primary/90 transition-colors duration-normal"
              >
                <NotebookPen className="h-3.5 w-3.5" />
                {t('copyToNotebook')}
              </button>
              <button
                type="button"
                onClick={() => onCut('chat', box)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-xs text-foreground hover:bg-muted transition-colors duration-normal"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {t('sendToChat')}
              </button>
              <button
                type="button"
                onClick={onClear}
                aria-label={t('cancelCut')}
                title={t('cancelCut')}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-normal"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

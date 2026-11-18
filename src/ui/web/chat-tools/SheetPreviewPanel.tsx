'use client'

import { Maximize2, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'

const ZOOM_STEPS = [100, 125, 150, 175, 200, 250, 300] as const
const MIN_SURFACE_PX = 120
/** Width the HTML page is laid out at before being scaled into the column. */
const HTML_PAGE_WIDTH_PX = 760

export type SheetPreviewContent =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'page'; node: ReactNode }
  | { kind: 'loading' }
  | { kind: 'empty' }

interface SheetPreviewPanelProps {
  /** e.g. "Page 3 of 18"; `null` hides it. */
  label: string | null
  content: SheetPreviewContent
}

/**
 * A miniature of the lesson material in the chat column: one page on a grey
 * desk, zoomable from fit-to-width up to 3×. Images scale by width; HTML
 * pages are laid out at a fixed page width and scaled with CSS `zoom` so they
 * keep the material's line breaks.
 */
export function SheetPreviewPanel({ label, content }: SheetPreviewPanelProps) {
  const t = useTranslations('courses.chatTools')
  const [zoomIndex, setZoomIndex] = useState(0)
  const [deskWidth, setDeskWidth] = useState(0)
  const deskRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const desk = deskRef.current
    if (!desk) return undefined
    const measure = () => {
      const style = getComputedStyle(desk)
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      setDeskWidth(desk.clientWidth - padding)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(desk)
    return () => observer.disconnect()
  }, [])

  const zoom = ZOOM_STEPS[zoomIndex]
  const surfaceWidth = Math.max(MIN_SURFACE_PX, Math.round((deskWidth * zoom) / 100))
  const hasPage = content.kind === 'image' || content.kind === 'page'

  const zoomButton =
    'flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors duration-normal hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-disabled'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-content-gap-xs border-b border-border bg-card px-4 py-2">
        <span className="truncate text-body-xs font-semibold text-foreground/80">{label}</span>
        <div dir="ltr" className="flex items-center gap-1">
          <button
            type="button"
            className={zoomButton}
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            disabled={!hasPage || zoomIndex === 0}
            aria-label={t('sheetZoomOut')}
            title={t('sheetZoomOut')}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <output className="w-11 text-center text-body-2xs tabular-nums text-muted-foreground">
            {zoom}%
          </output>
          <button
            type="button"
            className={zoomButton}
            onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            disabled={!hasPage || zoomIndex === ZOOM_STEPS.length - 1}
            aria-label={t('sheetZoomIn')}
            title={t('sheetZoomIn')}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={cn(zoomButton, 'ms-1')}
            onClick={() => setZoomIndex(0)}
            disabled={!hasPage || zoomIndex === 0}
            aria-label={t('sheetFitWidth')}
            title={t('sheetFitWidth')}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={deskRef}
        dir="ltr"
        className="min-h-0 flex-1 overflow-auto overscroll-contain bg-muted px-3 pb-8 pt-3.5 [scrollbar-width:thin]"
      >
        {hasPage ? (
          <div
            className="relative mx-auto overflow-hidden bg-card shadow-elevation-1"
            style={{ width: surfaceWidth }}
          >
            {content.kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL from the PDF canvas
              <img
                src={content.src}
                alt={content.alt}
                draggable={false}
                className="block h-auto w-full select-none"
              />
            ) : (
              <div
                style={{ width: HTML_PAGE_WIDTH_PX, zoom: surfaceWidth / HTML_PAGE_WIDTH_PX }}
                className="pointer-events-none select-none"
              >
                {content.node}
              </div>
            )}
          </div>
        ) : (
          <p className="px-4 pt-section-sm text-center text-body-sm text-muted-foreground">
            {content.kind === 'loading' ? t('sheetLoading') : t('sheetEmpty')}
          </p>
        )}
      </div>
    </div>
  )
}

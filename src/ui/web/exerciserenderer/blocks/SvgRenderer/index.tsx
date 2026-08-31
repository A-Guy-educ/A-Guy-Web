'use client'

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { cn } from '@/infra/utils/ui'
import type { SvgBlock, CheckResult } from '../../types'
import { RichTextRenderer } from '../RichTextRenderer'
import { sanitizeSvg } from '../../utils/svgSanitize'

interface SvgRendererProps {
  block: SvgBlock
  selectedHotspotIds?: string[]
  onHotspotToggle?: (hotspotId: string) => void
  disabled?: boolean
  checkResult?: CheckResult | null
  correctHotspotIds?: string[]
}

export function SvgRenderer({
  block,
  selectedHotspotIds = [],
  onHotspotToggle,
  disabled,
  checkResult,
  correctHotspotIds,
}: SvgRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sanitizedSvg = useMemo(() => sanitizeSvg(block.value), [block.value])

  const isInteractive = block.interactive && block.hotspots && block.hotspots.length > 0

  // Force the inline SVG to scale with its container. Authored SVGs often
  // ship with fixed `width`/`height` attributes and no `viewBox`, which
  // makes `[&>svg]:h-auto` compute a fixed height while the width stretches
  // — the diagram appears to shift and burst out of its frame. We backfill
  // a viewBox from the intrinsic dimensions when it's missing, then swap
  // the size attributes for a 100%/auto pair so the browser scales
  // proportionally inside the card.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const svg = container.querySelector(':scope > svg') as SVGSVGElement | null
    if (!svg) return

    if (!svg.getAttribute('viewBox')) {
      const w = parseFloat(svg.getAttribute('width') || '')
      const h = parseFloat(svg.getAttribute('height') || '')
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      }
    }
    // If we still have no coordinate system, don't clobber width/height —
    // forcing height=auto on a viewBox-less SVG collapses it to 0 (h-auto
    // needs a viewBox to compute proportional height). Fall back to the
    // browser's default sizing so at least SOMETHING renders.
    if (!svg.getAttribute('viewBox')) return

    if (!svg.getAttribute('preserveAspectRatio')) {
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    }
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', 'auto')
  }, [sanitizedSvg])

  const getHotspotState = useCallback(
    (hotspotId: string): 'selected' | 'correct' | 'incorrect' | null => {
      if (checkResult) {
        const isCorrect = correctHotspotIds?.includes(hotspotId)
        const isSelected = selectedHotspotIds.includes(hotspotId)
        if (isSelected && isCorrect) return 'correct'
        if (isSelected && !isCorrect) return 'incorrect'
        return null
      }
      if (selectedHotspotIds.includes(hotspotId)) return 'selected'
      return null
    },
    [checkResult, correctHotspotIds, selectedHotspotIds],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isInteractive || !block.hotspots) return

    const cleanups: (() => void)[] = []

    for (const hotspot of block.hotspots) {
      const el =
        container.querySelector(hotspot.selector) ||
        container.querySelector(`[data-hotspot-id="${hotspot.id}"]`)
      if (!el) continue

      el.setAttribute('tabindex', '0')
      el.setAttribute('role', 'button')
      el.setAttribute('aria-label', hotspot.label || `Region ${hotspot.id}`)

      const state = getHotspotState(hotspot.id)
      const htmlEl = el as HTMLElement | SVGElement
      htmlEl.style.cursor = disabled ? 'not-allowed' : 'pointer'
      htmlEl.style.transition = 'opacity 0.2s'

      if (state === 'selected') {
        el.setAttribute('stroke', 'hsl(var(--primary))')
        el.setAttribute('stroke-width', '3')
      } else if (state === 'correct') {
        el.setAttribute('stroke', 'hsl(var(--success))')
        el.setAttribute('stroke-width', '3')
      } else if (state === 'incorrect') {
        el.setAttribute('stroke', 'hsl(var(--destructive))')
        el.setAttribute('stroke-width', '3')
      }

      const clickHandler = () => {
        if (!disabled) onHotspotToggle?.(hotspot.id)
      }
      const keyHandler = (e: Event) => {
        const key = (e as KeyboardEvent).key
        if (key === 'Enter' || key === ' ') {
          e.preventDefault()
          clickHandler()
        }
      }

      el.addEventListener('click', clickHandler)
      el.addEventListener('keydown', keyHandler)

      cleanups.push(() => {
        el.removeEventListener('click', clickHandler)
        el.removeEventListener('keydown', keyHandler)
      })
    }

    return () => cleanups.forEach((fn) => fn())
  }, [
    block.hotspots,
    isInteractive,
    selectedHotspotIds,
    disabled,
    getHotspotState,
    onHotspotToggle,
  ])

  const captionBlock = block.caption
    ? { ...block.caption, id: `${block.id}-caption`, mediaIds: block.caption.mediaIds || [] }
    : null

  return (
    <div className="rounded-xl border border-border/20 overflow-hidden bg-card shadow-elevation-1 p-3">
      <div
        ref={containerRef}
        role={isInteractive ? 'application' : 'img'}
        aria-label={block.altText || 'Diagram'}
        className={cn(
          'w-full max-w-full overflow-hidden',
          '[&>svg]:block [&>svg]:mx-auto [&>svg]:w-full [&>svg]:max-w-full [&>svg]:h-auto',
          isInteractive && 'select-none',
        )}
        dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
      />
      {captionBlock && (
        <div className="mt-2 text-body-sm text-muted-foreground text-center">
          <RichTextRenderer block={captionBlock} />
        </div>
      )}
    </div>
  )
}

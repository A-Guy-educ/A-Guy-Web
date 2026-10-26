'use client'

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { cn } from '@/infra/utils/ui'
import type { SvgBlock, CheckResult } from '../../types'
import { RichTextRenderer } from '../RichTextRenderer'
import { sanitizeSvg } from '../../utils/svgSanitize'
import { expandViewBoxWhenReady } from '@/ui/web/media/SVGMedia/expandViewBoxToContent'
import { ensureSvgViewBox } from '@/ui/web/media/SVGMedia/ensureSvgViewBox'
import { useMediaQuery } from '@/client/hooks/useMediaQuery'
import { useSketchMaxHeight } from '../../context/SketchMaxHeightContext'
import { getSvgAspectRatio, getSvgCardStyle, type DisplaySize } from './svgSizing'

export type { DisplaySize }

// Tailwind `md` breakpoint, same as useEffectiveDisplaySize.
const MOBILE_QUERY = '(max-width: 767px)'

interface SvgRendererProps {
  block: SvgBlock
  selectedHotspotIds?: string[]
  onHotspotToggle?: (hotspotId: string) => void
  disabled?: boolean
  checkResult?: CheckResult | null
  correctHotspotIds?: string[]
  /** Authored size; scales the whole sketch (card + SVG). Defaults to `full`. */
  displaySize?: DisplaySize
}

export function SvgRenderer({
  block,
  selectedHotspotIds = [],
  onHotspotToggle,
  disabled,
  checkResult,
  correctHotspotIds,
  displaySize,
}: SvgRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Bake the viewBox into the markup BEFORE it hits the DOM so the SVG is
  // always sized by its coordinate system, not by fixed-pixel width/height
  // attributes. The post-mount useEffect below is the belt for content-bbox
  // expansion; this is the suspenders — greyed chat history has been
  // observed with the raw authored SVG in the DOM (no viewBox),
  // suggesting the effect can miss under some React remount timing. Doing
  // this in useMemo means the viewBox is present the first time React
  // inserts the HTML.
  const sanitizedSvg = useMemo(() => sanitizeSvg(ensureSvgViewBox(block.value)), [block.value])

  const isInteractive = block.interactive && block.hotspots && block.hotspots.length > 0

  const isMobile = useMediaQuery(MOBILE_QUERY)
  const maxHeight = useSketchMaxHeight()
  const cardStyle = useMemo(
    () => getSvgCardStyle(getSvgAspectRatio(sanitizedSvg), displaySize, isMobile, maxHeight),
    [sanitizedSvg, displaySize, isMobile, maxHeight],
  )

  // Ensure every direct <svg> child has a viewBox and a preserveAspectRatio
  // so the CSS rules below (`[&>svg]:w-full [&>svg]:h-auto`) can scale the
  // diagram to the card width without clipping or distortion.
  //
  // IMPORTANT: iterate over EVERY direct <svg> child, not just the first.
  // Admin occasionally stores two sibling <svg> blocks in a single field
  // (duplicate save path — tracked separately on the Admin side). If we
  // only normalize the first, the second renders at its raw intrinsic
  // size while the first scales up — producing the "top row normal,
  // bottom row shrunken" artifact students saw in the scroll view.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const svgs = Array.from(container.querySelectorAll(':scope > svg')) as SVGSVGElement[]
    if (svgs.length === 0) return

    const cleanups: Array<() => void> = []
    for (const svg of svgs) {
      if (!svg.getAttribute('viewBox')) {
        const w = parseFloat(svg.getAttribute('width') || '')
        const h = parseFloat(svg.getAttribute('height') || '')
        if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
          svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
        }
      }
      // If we still have no coordinate system, don't clobber width/height —
      // forcing CSS sizing on a viewBox-less SVG can collapse it to zero.
      // Fall back to the browser's default sizing so at least SOMETHING
      // renders.
      if (!svg.getAttribute('viewBox')) continue

      if (!svg.getAttribute('preserveAspectRatio')) {
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      }

      // Authored width/height often under-estimates the real extent of the
      // rendered content (emoji <text>, wider-than-expected labels). Grow
      // the viewBox to cover the actual bbox so CSS scaling doesn't preserve
      // a clip on the right/bottom edges.
      const cleanup = expandViewBoxWhenReady(svg)
      if (cleanup) cleanups.push(cleanup)
    }

    return () => {
      for (const fn of cleanups) fn()
    }
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

  // The outer wrapper owns the width (see svgSizing.ts) so the whole card,
  // caption included, tracks the sketch width. There is deliberately no fixed
  // height: each <svg> fills the width and takes its height from the viewBox,
  // so the card hugs the drawing instead of letterboxing it on mobile.
  return (
    <div
      className="rounded-xl border border-border/20 overflow-hidden bg-card shadow-elevation-1 mx-auto max-w-full"
      style={cardStyle}
    >
      <div
        ref={containerRef}
        role={isInteractive ? 'application' : 'img'}
        aria-label={block.altText || 'Diagram'}
        // dir="ltr" prevents author-LTR SVG text (math notation, mixed
        // Latin+RTL labels) from being visually reordered when the exercise
        // is rendered inside an RTL page — SVG text inherits the ancestor's
        // CSS `direction`, and no author expects "4 + 3 · 2 =" to render as
        // "= 2 · 3 + 4".
        dir="ltr"
        // Sketches are authored for a white page; see `.diagram-invert`.
        data-theme="light"
        className={cn(
          'diagram-invert text-foreground overflow-hidden [&>svg]:block [&>svg]:w-full [&>svg]:h-auto',
          isInteractive && 'select-none',
        )}
        dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
      />
      {captionBlock && (
        <div className="px-3 pb-3 pt-2 text-body-sm text-muted-foreground text-center">
          <RichTextRenderer block={captionBlock} />
        </div>
      )}
    </div>
  )
}

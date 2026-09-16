'use client'

import { cn } from '@/infra/utils/ui'
import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

import type { Props as MediaProps } from '../types'

import { getMediaUrl } from '@/infra/utils/getMediaUrl'
import { fetchInlineSvg } from './fetchInlineSvg'
import { expandViewBoxWhenReady } from './expandViewBoxToContent'

export const SVGMedia: React.FC<MediaProps> = (props) => {
  const { resource, className, imgClassName, alt } = props

  const resourceObj = resource && typeof resource === 'object' ? resource : null
  const filename = resourceObj?.filename
  const url = resourceObj?.url
  const altFromResource = resourceObj?.alt
  const width = resourceObj?.width
  const height = resourceObj?.height

  const svgUrl = url ? getMediaUrl(url) : filename ? getMediaUrl(`/media/${filename}`) : null

  const [inlineMarkup, setInlineMarkup] = useState<string | null>(null)
  const inlineHostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Reset immediately so a URL swap cannot leak the previous SVG's markup
    // into the new URL's render pass. Without this, the `inlineMarkup` branch
    // below would keep showing the old image (or worse, show it as belonging
    // to the new resource) until the new fetch resolves.
    setInlineMarkup(null)

    if (!svgUrl) return
    let cancelled = false

    fetchInlineSvg(svgUrl)
      .then((html) => {
        if (!cancelled) setInlineMarkup(html)
      })
      .catch(() => {
        // On failure the Image fallback below stays visible — no permanent
        // blank hole. See fetchInlineSvg for why failures are not cached.
      })

    return () => {
      cancelled = true
    }
  }, [svgUrl])

  // Grow the injected SVG's viewBox to cover its real content bbox once
  // the markup is committed to the DOM. Mirrors the fix in SvgRenderer:
  // author dimensions frequently under-estimate emoji / long-label widths,
  // and the container scale-up preserves that shortfall as a clip.
  useEffect(() => {
    if (!inlineMarkup) return
    const host = inlineHostRef.current
    if (!host) return
    const svg = host.querySelector(':scope > svg') as SVGSVGElement | null
    if (!svg) return
    return expandViewBoxWhenReady(svg)
  }, [inlineMarkup])

  if (!resourceObj || !svgUrl) return null

  const altText = alt || altFromResource || 'SVG image'

  if (inlineMarkup) {
    return (
      <div
        className={cn('svg-media flex items-center justify-center', className)}
        role="img"
        aria-label={altText}
      >
        <div
          ref={inlineHostRef}
          // dir="ltr" prevents author-LTR SVG text (math notation, mixed
          // Latin+RTL captions) from being visually reordered when the SVG
          // is rendered inside an RTL page — SVG text inherits the
          // ancestor's CSS `direction`, and no author expects "4 + 3 · 2 ="
          // to render as "= 2 · 3 + 4".
          dir="ltr"
          className={cn(
            'max-w-full h-auto dark:invert [&>svg]:max-w-full [&>svg]:h-auto',
            imgClassName,
          )}
          dangerouslySetInnerHTML={{ __html: inlineMarkup }}
        />
      </div>
    )
  }

  // Initial render (SSR + first client paint before the fetch resolves) shows
  // the raw Image so browsers can preload it in parallel with the JS bundle
  // and no-JS clients still see the SVG. It is also the permanent fallback if
  // the fetch fails — the viewBox mis-scaling this component fixes affects
  // rendered dimensions, not whether anything renders at all.
  return (
    <div className={cn('svg-media flex items-center justify-center', className)}>
      <Image
        src={svgUrl}
        alt={altText}
        width={width || 800}
        height={height || 600}
        className={cn('max-w-full h-auto dark:invert', imgClassName)}
        unoptimized
      />
    </div>
  )
}

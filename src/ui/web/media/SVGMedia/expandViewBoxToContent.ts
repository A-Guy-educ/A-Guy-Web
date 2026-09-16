/**
 * @fileType utility
 * @domain ui
 * @pattern svg-normalization
 * @ai-summary Expands a mounted SVG's viewBox so its rendered content fits, keeping author-declared padding intact.
 */

/**
 * Grow an SVG's `viewBox` so it covers everything actually drawn inside it.
 *
 * WHY: `ensureSvgViewBox` derives the viewBox from the SVG's declared
 * width/height, which is only correct when the author's `<text>` / shapes
 * fit within that box. Emoji and variable-metric fonts routinely render
 * wider than the author estimated, and the renderer then scales the SVG to
 * fill its container via `width="100%"` — the overflow is preserved in
 * coordinate space and clipped by the viewBox. This function measures the
 * real content bbox after mount and unions it with the existing viewBox so
 * nothing falls off the right/bottom edge.
 *
 * Behaviour:
 *  - Only expands, never shrinks — author padding around the content is
 *    preserved so this is safe to run on already-well-sized diagrams.
 *  - Numeric `width` / `height` attributes are scaled by the same factor
 *    the viewBox grew by, so content pixel density is preserved when the
 *    SVG is rendered at its intrinsic size (SVGMedia's default). Percent /
 *    unit-suffixed / `auto` dimensions are left alone — the caller
 *    intentionally deferred sizing to the render context.
 *  - No-op when the SVG has no `viewBox`, when `getBBox()` throws (jsdom,
 *    disconnected trees), or when the bbox is empty.
 *  - Idempotent: running it a second time with the same content produces
 *    no attribute write.
 */
export function expandViewBoxToContent(svg: SVGSVGElement): void {
  const currentViewBox = svg.getAttribute('viewBox')
  if (!currentViewBox) return

  const parts = currentViewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return
  const [vx, vy, vw, vh] = parts

  let bbox: { x: number; y: number; width: number; height: number }
  try {
    bbox = svg.getBBox()
  } catch {
    return
  }
  if (!bbox || bbox.width <= 0 || bbox.height <= 0) return

  const left = Math.min(vx, bbox.x)
  const top = Math.min(vy, bbox.y)
  const right = Math.max(vx + vw, bbox.x + bbox.width)
  const bottom = Math.max(vy + vh, bbox.y + bbox.height)
  const newW = right - left
  const newH = bottom - top

  // Sub-pixel changes aren't worth an attribute write — the render is
  // already correct at that scale and skipping avoids gratuitous DOM
  // mutation churn during React re-renders.
  const EPS = 0.5
  if (
    Math.abs(left - vx) < EPS &&
    Math.abs(top - vy) < EPS &&
    Math.abs(newW - vw) < EPS &&
    Math.abs(newH - vh) < EPS
  ) {
    return
  }

  svg.setAttribute('viewBox', `${left} ${top} ${newW} ${newH}`)

  // Keep the intrinsic pixel dimensions in lock-step with the viewBox
  // growth. Without this, an SVG authored at width="250" whose viewBox we
  // grow to 310 units still renders at 250 CSS pixels — the browser packs
  // 310 units of content into 250 pixels and every glyph shrinks by ~20%.
  // Renderers that force `width="100%"` (SvgRenderer) are unaffected
  // because the scaler skips non-numeric values.
  scaleIntrinsicDimension(svg, 'width', newW / vw)
  scaleIntrinsicDimension(svg, 'height', newH / vh)
}

function scaleIntrinsicDimension(
  svg: SVGSVGElement,
  attr: 'width' | 'height',
  factor: number,
): void {
  if (Math.abs(factor - 1) < 1e-6) return
  const raw = svg.getAttribute(attr)
  if (!raw) return
  // Only touch bare-number and px-suffixed values. Percentages / em / vw /
  // `auto` are container-relative — the caller intentionally deferred to
  // the render context, so multiplying them would fight the layout.
  const match = raw.trim().match(/^([\d.]+)(px)?$/i)
  if (!match) return
  const value = parseFloat(match[1])
  if (!Number.isFinite(value) || value <= 0) return
  svg.setAttribute(attr, `${value * factor}${match[2] ?? ''}`)
}

/**
 * Expand the viewBox immediately, then keep retrying at the two points
 * that reliably change what `getBBox()` returns:
 *
 *  1. `document.fonts.ready` — text bbox before fonts resolve uses fallback
 *     metrics and can under-report width by 20%+.
 *  2. First non-zero size via `ResizeObserver` — an SVG mounted while any
 *     ancestor is `display:none` (collapsed accordion, inactive tab,
 *     off-screen chat bubble that later scrolls into view) reports an empty
 *     bbox on mount; without a re-run, it stays clipped forever once
 *     revealed.
 *
 * Returns a cleanup function that disconnects the observer. Callers should
 * invoke it from the `useEffect` cleanup so we don't leak observers on
 * unmount / prop changes.
 */
export function expandViewBoxWhenReady(svg: SVGSVGElement): () => void {
  expandViewBoxToContent(svg)

  const cleanups: (() => void)[] = []

  if (typeof document !== 'undefined') {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    if (fonts?.ready && svg.querySelector('text')) {
      fonts.ready
        .then(() => {
          if (svg.isConnected) expandViewBoxToContent(svg)
        })
        .catch(() => {
          // Font loading failure just means we keep the pre-fonts bbox —
          // no worse than the current behaviour, so nothing to escalate.
        })
    }
  }

  if (typeof ResizeObserver !== 'undefined') {
    let done = false
    const observer = new ResizeObserver((entries) => {
      if (done) return
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          done = true
          expandViewBoxToContent(svg)
          observer.disconnect()
          break
        }
      }
    })
    observer.observe(svg)
    cleanups.push(() => observer.disconnect())
  }

  return () => cleanups.forEach((fn) => fn())
}

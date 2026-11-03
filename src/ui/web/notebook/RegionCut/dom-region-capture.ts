/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Crops a screen rectangle out of our own rendered worksheet (the Scroll tab) with html-to-image. Only the selected region is rasterised, so it renders sharp however tall the worksheet is. Fonts are embedded once per session, since KaTeX alone ships ~20 font files.
 */
import { getFontEmbedCSS, toCanvas } from 'html-to-image'

import type { ViewportBox } from './CutSelection'
import type { CapturedRegion } from './pdf-region-capture'

/** Upper bound on the output's long side, matching PDF cuts. */
const MAX_OUTPUT_SIDE = 2400
/**
 * Cuts are shown at the notebook's full page width, usually wider than they
 * were on screen, so render above screen resolution to stay sharp when scaled up.
 */
const RENDER_RATIO = 3

let fontCss: Promise<string> | null = null

/** Safari on macOS, and every browser on iOS/iPadOS (all of them run WebKit). */
function isWebKitSafari(): boolean {
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  return iOS || (/Safari/.test(ua) && !/Chrome|Chromium|Android/.test(ua))
}

function contains(outer: DOMRect, box: ViewportBox): boolean {
  return (
    outer.left <= box.left &&
    outer.top <= box.top &&
    outer.right >= box.left + box.width &&
    outer.bottom >= box.top + box.height
  )
}

/** The smallest element inside `surface` that fully contains the selection — less to clone. */
function smallestContaining(surface: HTMLElement, box: ViewportBox): HTMLElement {
  let node = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
  while (node instanceof HTMLElement && node !== surface && surface.contains(node)) {
    if (contains(node.getBoundingClientRect(), box)) return node
    node = node.parentElement
  }
  return surface
}

export async function captureDomRegion(
  surface: HTMLElement,
  selection: ViewportBox,
): Promise<CapturedRegion | null> {
  // Only the part of the selection that lies on the worksheet.
  const bounds = surface.getBoundingClientRect()
  const left = Math.max(selection.left, bounds.left)
  const top = Math.max(selection.top, bounds.top)
  const right = Math.min(selection.left + selection.width, bounds.right)
  const bottom = Math.min(selection.top + selection.height, bounds.bottom)
  if (right <= left || bottom <= top) return null
  const box = { left, top, width: right - left, height: bottom - top }

  const node = smallestContaining(surface, box)
  const rect = node.getBoundingClientRect()
  const pixelRatio = Math.min(RENDER_RATIO, MAX_OUTPUT_SIDE / Math.max(box.width, box.height))

  fontCss ??= getFontEmbedCSS(surface).catch((err: unknown) => {
    fontCss = null
    throw err
  })

  // html-to-image sizes the output from `width`/`height` but also applies
  // them to the cloned node; `style` is applied after, so it restores the
  // node's real layout size and shifts it so the selection sits at the
  // origin. The output then holds exactly the selection, nothing else.
  //
  // The clone also copies every computed style, including `max-width: 100%`,
  // which would cap the root at the selection's width while its children keep
  // their real pixel widths. In RTL those children overflow to the left, so
  // the content shifted sideways (dead space on the right, left side cut off).
  // Lifting the caps keeps the root at its true size in every direction.
  const options: Parameters<typeof toCanvas>[1] = {
    width: box.width,
    height: box.height,
    pixelRatio,
    fontEmbedCSS: await fontCss,
    backgroundColor: getComputedStyle(surface).backgroundColor,
    style: {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      minWidth: `${rect.width}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      margin: '0',
      transform: `translate(${rect.left - box.left}px, ${rect.top - box.top}px)`,
      transformOrigin: '0 0',
    },
  }
  // WebKit decodes the SVG snapshot before its embedded fonts and images are
  // ready, so the first render can come out with fallback fonts (broken
  // math). Rendering twice and keeping the second is html-to-image's known
  // workaround; other engines don't need the extra pass.
  if (isWebKitSafari()) await toCanvas(node, options)
  const canvas = await toCanvas(node, options)

  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}

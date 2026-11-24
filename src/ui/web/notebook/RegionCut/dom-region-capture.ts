/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Rasterises one whole block of our own rendered worksheet (an exercise in the Scroll tab) with html-to-image, for its "copy to notebook" button. The block is the clone root, so nothing outside it is cloned or measured. Fonts are embedded once per session, since KaTeX alone ships ~20 font files.
 */
import { getFontEmbedCSS, toCanvas } from 'html-to-image'

import type { CapturedRegion } from './pdf-region-capture'

/** Marks controls inside a block (the copy button itself) that stay out of the image. */
export const CUT_IGNORE_ATTR = 'data-cut-ignore'

/** Upper bound on the output's long side, matching PDF cuts. */
const MAX_OUTPUT_SIDE = 2400
/**
 * Copies are shown at the notebook's full page width, usually wider than they
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

/**
 * Each KaTeX font lists woff2, woff and ttf, and browsers use the first they
 * support. Dropping the rest makes the snapshot a third of the size. The
 * library's `preferredFontFormat` can't do this: it loses some fonts entirely,
 * which turned math bold.
 */
export function keepFirstFontSource(css: string): string {
  return css.replace(/,\s*url\([^)]*\)(\s*format\([^)]*\))?/g, '')
}

function loadFontCss(surface: HTMLElement): Promise<string> {
  fontCss ??= getFontEmbedCSS(surface)
    .then(keepFirstFontSource)
    .catch((err: unknown) => {
      fontCss = null
      throw err
    })
  return fontCss
}

/** Fetches the fonts ahead of the click. A failure resurfaces on the copy, which retries. */
export function prepareDomCapture(surface: HTMLElement): void {
  loadFontCss(surface).catch(() => undefined)
}

export async function captureDomBlock(
  block: HTMLElement,
  surface: HTMLElement,
): Promise<CapturedRegion | null> {
  const rect = block.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  const pixelRatio = Math.min(RENDER_RATIO, MAX_OUTPUT_SIDE / Math.max(rect.width, rect.height))

  // The separator between exercises (margin and top border) belongs to the
  // worksheet, not the exercise. The clone also copies every computed style,
  // including `max-width: 100%`; lifting it keeps RTL content from shifting
  // sideways inside the snapshot.
  const options: Parameters<typeof toCanvas>[1] = {
    width: rect.width,
    height: rect.height,
    pixelRatio,
    fontEmbedCSS: await loadFontCss(surface),
    filter: (node) => !(node instanceof HTMLElement && node.hasAttribute(CUT_IGNORE_ATTR)),
    backgroundColor: getComputedStyle(surface).backgroundColor,
    style: { margin: '0', borderTopWidth: '0', maxWidth: 'none', maxHeight: 'none' },
  }
  // WebKit decodes the SVG snapshot before its embedded fonts and images are
  // ready, so the first render can come out with fallback fonts (broken
  // math). Rendering twice and keeping the second is html-to-image's known
  // workaround; other engines don't need the extra pass.
  if (isWebKitSafari()) await toCanvas(block, options)
  const canvas = await toCanvas(block, options)

  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}

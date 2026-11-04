/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Crops a screen rectangle out of the PDF.js viewer running in a same-origin iframe by reading its rendered page canvases. A selection that spans a page break is stitched from both pages.
 */
import type { NotebookCutRect } from '@/infra/types/notebook'

type PageView = { div?: HTMLElement; canvas?: HTMLCanvasElement }
type PdfJsWindow = Window & {
  PDFViewerApplication?: {
    pdfViewer?: { pagesCount?: number; getPageView?: (index: number) => PageView | undefined }
  }
}

/** Upper bound on the output's long side, so a full-page cut stays a reasonable upload. */
const MAX_OUTPUT_SIDE = 2400

export interface CapturedRegion {
  dataUrl: string
  width: number
  height: number
  /** PDF cuts only: first page the selection touches, and the selection normalised to that page. */
  page?: number
  pageRect?: NotebookCutRect
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

function intersect(a: Box, b: Box): Box | null {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.left + a.width, b.left + b.width)
  const bottom = Math.min(a.top + a.height, b.top + b.height)
  return right > left && bottom > top
    ? { left, top, width: right - left, height: bottom - top }
    : null
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/**
 * @param selection The rectangle in the parent window's viewport coordinates.
 * @returns `null` when the viewer is not ready or the selection covers no rendered page.
 */
export function capturePdfRegion(iframe: HTMLIFrameElement, selection: Box): CapturedRegion | null {
  let viewer
  try {
    viewer = (iframe.contentWindow as PdfJsWindow | null)?.PDFViewerApplication?.pdfViewer
  } catch {
    return null
  }
  const count = viewer?.pagesCount ?? 0
  if (!viewer?.getPageView || !count) return null

  // The iframe's viewport starts at its own top-left corner.
  const frame = iframe.getBoundingClientRect()
  const local = { ...selection, left: selection.left - frame.left, top: selection.top - frame.top }

  const parts: { canvas: HTMLCanvasElement; box: Box; overlap: Box; page: number }[] = []
  for (let index = 0; index < count; index++) {
    const canvas = viewer.getPageView(index)?.canvas
    if (!canvas?.isConnected || !canvas.width) continue
    const box = canvas.getBoundingClientRect()
    const overlap = intersect(local, box)
    if (overlap) parts.push({ canvas, box, overlap, page: index + 1 })
  }
  if (!parts.length) return null

  const [first] = parts
  const sourceScale = first.canvas.width / first.box.width
  const scale = Math.min(sourceScale, MAX_OUTPUT_SIDE / Math.max(local.width, local.height))
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(local.width * scale))
  out.height = Math.max(1, Math.round(local.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, out.width, out.height)

  for (const { canvas, box, overlap } of parts) {
    const sx = canvas.width / box.width
    const sy = canvas.height / box.height
    ctx.drawImage(
      canvas,
      (overlap.left - box.left) * sx,
      (overlap.top - box.top) * sy,
      overlap.width * sx,
      overlap.height * sy,
      (overlap.left - local.left) * scale,
      (overlap.top - local.top) * scale,
      overlap.width * scale,
      overlap.height * scale,
    )
  }

  const { box } = first
  return {
    dataUrl: out.toDataURL('image/png'),
    width: out.width,
    height: out.height,
    page: first.page,
    pageRect: {
      x: clamp01((local.left - box.left) / box.width),
      y: clamp01((local.top - box.top) / box.height),
      w: clamp01(local.width / box.width),
      h: clamp01(local.height / box.height),
    },
  }
}

/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Crops a screen rectangle out of an uploaded image at the file's own resolution, so a cut is as sharp as the upload however small it was shown. The image must be same-origin (the media proxy) or the canvas can't be read back.
 */
import type { ViewportBox } from './CutSelection'
import type { CapturedRegion } from './pdf-region-capture'

/** Upper bound on the output's long side, matching PDF cuts. */
const MAX_OUTPUT_SIDE = 2400
/** Uploads are usually photos, which as PNG can exceed the upload size limit. */
const JPEG_QUALITY = 0.92

type Displayed = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>

export interface ImageCrop {
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  outputWidth: number
  outputHeight: number
}

/** Maps a selection on the displayed image to file pixels, or `null` if it misses the image. */
export function imageCropFor(
  selection: ViewportBox,
  displayed: Displayed,
  natural: { width: number; height: number },
): ImageCrop | null {
  const left = Math.max(selection.left, displayed.left)
  const top = Math.max(selection.top, displayed.top)
  const right = Math.min(selection.left + selection.width, displayed.left + displayed.width)
  const bottom = Math.min(selection.top + selection.height, displayed.top + displayed.height)
  if (right <= left || bottom <= top) return null

  const scaleX = natural.width / displayed.width
  const scaleY = natural.height / displayed.height
  const sourceWidth = (right - left) * scaleX
  const sourceHeight = (bottom - top) * scaleY
  const shrink = Math.min(1, MAX_OUTPUT_SIDE / Math.max(sourceWidth, sourceHeight))

  return {
    sourceX: (left - displayed.left) * scaleX,
    sourceY: (top - displayed.top) * scaleY,
    sourceWidth,
    sourceHeight,
    outputWidth: Math.max(1, Math.round(sourceWidth * shrink)),
    outputHeight: Math.max(1, Math.round(sourceHeight * shrink)),
  }
}

export function captureImageRegion(
  image: HTMLImageElement,
  selection: ViewportBox,
): CapturedRegion | null {
  if (!image.complete || !image.naturalWidth) return null
  const crop = imageCropFor(selection, image.getBoundingClientRect(), {
    width: image.naturalWidth,
    height: image.naturalHeight,
  })
  if (!crop) return null

  const canvas = document.createElement('canvas')
  canvas.width = crop.outputWidth
  canvas.height = crop.outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // JPEG has no transparency; a transparent upload would otherwise turn black.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(
    image,
    crop.sourceX,
    crop.sourceY,
    crop.sourceWidth,
    crop.sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  return {
    dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
    width: canvas.width,
    height: canvas.height,
  }
}

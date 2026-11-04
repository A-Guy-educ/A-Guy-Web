/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Renders a page's handwriting onto white as a PNG for "check this page". The cut exercise is not baked in — the check sends it separately by media id, which is what the tutor's check prompt expects and avoids reading a cross-origin image back from a canvas.
 */
import { NOTEBOOK_PAGE_WIDTH, type NotebookPage } from '@/infra/types/notebook'
import { drawStrokes } from './stroke-render'

export function flattenPageInk(page: NotebookPage, inks: readonly string[]): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = NOTEBOOK_PAGE_WIDTH
  canvas.height = page.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Ink first on a transparent layer so eraser strokes cut ink, not the
  // white background, then composite onto white.
  drawStrokes(ctx, page.strokes, inks)
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

/**
 * Shrinks a homework photo before it is sent for lesson suggestions. Phone
 * photos are several MB; the model only needs to read the exercise, and the
 * request has to fit Vercel's 4.5 MB body limit.
 *
 * @fileType utility
 * @domain frontend
 */
import type { LessonSuggestImage } from '@/server/services/lesson-suggest/generateLessonSuggestion'

const MAX_EDGE_PX = 1280
const JPEG_QUALITY = 0.85

export function isSuggestableImage(file: File): boolean {
  return file.type.startsWith('image/')
}

export async function downscaleImageForSuggest(file: File): Promise<LessonSuggestImage> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  return { mimeType: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}

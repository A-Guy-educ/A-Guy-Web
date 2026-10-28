/**
 * Lesson visit identity + heartbeat payloads.
 *
 * A "visit" is one mount of a lesson page. Its `visitId` rides along on
 * every /api/stats/heartbeat so the server can keep per-visit dwell
 * (Product Health "≥60s within a single lesson session") instead of only
 * the cumulative per-lesson counter.
 *
 * @fileType utility
 * @domain analytics
 * @pattern heartbeat
 * @ai-summary Visit id minting, heartbeat body builder, and the PDF-scroll window event name
 */

export type LessonVisitContentType = 'pdf' | 'exercises' | 'blocks'

export interface LessonVisitInfo {
  lessonId: string
  courseId?: string
  contentType?: LessonVisitContentType
}

export interface LessonVisit extends LessonVisitInfo {
  visitId: string
}

/** Fired on `window` (once per PDF load) when the user scrolls the PDF viewer. */
export const MEDIA_PDF_SCROLL_EVENT = 'media-pdf-scroll' as const

const HEX24 = /^[a-f0-9]{24}$/i

export function mintVisitId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function heartbeatBody(
  seconds: number,
  visit: LessonVisit | null,
  scrolled = false,
): Record<string, unknown> {
  if (!visit) return { seconds }
  return {
    seconds,
    lessonId: visit.lessonId,
    visitId: visit.visitId,
    ...(visit.courseId && HEX24.test(visit.courseId) ? { courseId: visit.courseId } : {}),
    ...(visit.contentType ? { contentType: visit.contentType } : {}),
    ...(scrolled ? { scrolled: true } : {}),
  }
}

export async function postHeartbeat(body: Record<string, unknown>): Promise<void> {
  await fetch('/api/stats/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  })
}

/**
 * @fileType service
 * @domain debug
 * @ai-summary One-off diagnostic that mirrors `loadLessonContext` from the
 * tutor chat and returns exactly what Gemini would receive for a given
 * lessonId (text preview, each attached media doc, the URL the server
 * fetches, the loaded buffer size + mime + sha-256, whether it clears
 * the inline-part gate). Used by /api/admin/debug/lesson-context.
 */

import crypto from 'crypto'

import { ObjectId } from 'mongodb'

import { getContentDb, relationId } from '@/infra/db/content-db'
import { resolveMediaSourceUrl } from '@/infra/media/resolveMediaSourceUrl'
import { CHAT_ASSET_ALLOWED_MIME_TYPES, CHAT_ASSET_MAX_BYTES } from '@/server/chat-assets/constants'

const SUPPORTED_INLINE_MIME_TYPES = new Set<string>(CHAT_ASSET_ALLOWED_MIME_TYPES)
const CONTEXT_TEXT_PREVIEW_CHARS = 1500

type MediaDoc = Record<string, unknown> & {
  _id: ObjectId
  filename?: unknown
  originalFilename?: unknown
  mimeType?: unknown
  filesize?: unknown
  url?: unknown
}

function cleanMimeType(mimeType: unknown): string {
  return String(mimeType || '')
    .split(';')[0]
    ?.trim()
    .toLowerCase()
}

function sha256First(buffer: Buffer, limit = 1024 * 32): string {
  const slice = buffer.length > limit ? buffer.subarray(0, limit) : buffer
  return crypto.createHash('sha256').update(slice).digest('hex')
}

export type LessonContextDiagnostic =
  | { ok: false; status: 400 | 404; error: string }
  | {
      ok: true
      lessonId: string
      title: unknown
      chapterId: string | null
      lessonContextText: { length: number; preview: string; truncated: boolean }
      contentFilesCount: number
      attachments: Array<{
        mediaId: string
        filename: unknown
        originalFilename: unknown
        dbMimeType: string
        dbFilesize: number
        rawUrl: string | null
        resolvedUrl: string | null
        loaded: {
          status?: number
          statusText?: string
          bytes?: number
          mimeType?: string
          sha256First32kb?: string
          error?: string
        }
        wouldBeIncludedAsInlinePart: boolean
        gateFailures: string[]
      }>
      constants: { allowedMimeTypes: string[]; maxBytes: number }
    }

export async function diagnoseLessonContext(lessonId: string): Promise<LessonContextDiagnostic> {
  if (!lessonId || !ObjectId.isValid(lessonId)) {
    return { ok: false, status: 400, error: 'Pass ?lessonId=<24-hex-id>' }
  }

  const db = await getContentDb()
  const lesson = await db
    .collection('lessons')
    .findOne(
      { _id: new ObjectId(lessonId) },
      { projection: { lessonContextText: 1, contentFiles: 1, chapter: 1, title: 1 } },
    )
  if (!lesson) return { ok: false, status: 404, error: 'Lesson not found' }

  const rawText = typeof lesson.lessonContextText === 'string' ? lesson.lessonContextText : ''
  const files = Array.isArray(lesson.contentFiles) ? lesson.contentFiles : []

  const mediaIds = files
    .map((file: unknown) => {
      if (typeof file === 'string') return file
      if (!file || typeof file !== 'object') return null
      const record = file as { _id?: unknown; id?: unknown }
      return String(record._id ?? record.id ?? '')
    })
    .filter((id: string | null): id is string => Boolean(id && ObjectId.isValid(id)))

  const mediaDocs =
    mediaIds.length === 0
      ? []
      : ((await db
          .collection('media')
          .find({ _id: { $in: mediaIds.map((id) => new ObjectId(id)) } })
          .toArray()) as MediaDoc[])

  const attachments = await Promise.all(
    mediaDocs.map(async (doc) => {
      const mimeTypeDb = cleanMimeType(doc.mimeType)
      const filesizeDb = Number(doc.filesize || 0)
      const rawUrl = typeof doc.url === 'string' ? doc.url : null
      const resolvedUrl = rawUrl ? resolveMediaSourceUrl(rawUrl) : null

      const gateFailures: string[] = []
      if (!SUPPORTED_INLINE_MIME_TYPES.has(mimeTypeDb)) {
        gateFailures.push(`db mimeType ${mimeTypeDb || '(empty)'} not in allowed set`)
      }
      if (filesizeDb > CHAT_ASSET_MAX_BYTES) {
        gateFailures.push(`db filesize ${filesizeDb} > ${CHAT_ASSET_MAX_BYTES}`)
      }

      const loaded: {
        status?: number
        statusText?: string
        bytes?: number
        mimeType?: string
        sha256First32kb?: string
        error?: string
      } = {}
      if (resolvedUrl) {
        try {
          const response = await fetch(resolvedUrl, { signal: AbortSignal.timeout(30_000) })
          loaded.status = response.status
          loaded.statusText = response.statusText
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer())
            loaded.bytes = buffer.length
            loaded.mimeType = cleanMimeType(response.headers.get('content-type'))
            loaded.sha256First32kb = sha256First(buffer)
            if (!SUPPORTED_INLINE_MIME_TYPES.has(loaded.mimeType)) {
              gateFailures.push(`fetched mimeType ${loaded.mimeType} not in allowed set`)
            }
            if (loaded.bytes > CHAT_ASSET_MAX_BYTES) {
              gateFailures.push(`fetched bytes ${loaded.bytes} > ${CHAT_ASSET_MAX_BYTES}`)
            }
          }
        } catch (err) {
          loaded.error = err instanceof Error ? err.message : String(err)
        }
      } else {
        loaded.error =
          'url did not resolve (missing url or no NEXT_PUBLIC_ADMIN_URL for proxy path)'
      }

      return {
        mediaId: String(doc._id),
        filename: doc.filename ?? null,
        originalFilename: doc.originalFilename ?? null,
        dbMimeType: mimeTypeDb,
        dbFilesize: filesizeDb,
        rawUrl,
        resolvedUrl,
        loaded,
        wouldBeIncludedAsInlinePart: gateFailures.length === 0,
        gateFailures,
      }
    }),
  )

  const preview = rawText.slice(0, CONTEXT_TEXT_PREVIEW_CHARS)
  return {
    ok: true,
    lessonId,
    title: lesson.title ?? null,
    chapterId: relationId(lesson.chapter) ?? null,
    lessonContextText: {
      length: rawText.length,
      preview,
      truncated: rawText.length > preview.length,
    },
    contentFilesCount: files.length,
    attachments,
    constants: {
      allowedMimeTypes: Array.from(SUPPORTED_INLINE_MIME_TYPES),
      maxBytes: CHAT_ASSET_MAX_BYTES,
    },
  }
}

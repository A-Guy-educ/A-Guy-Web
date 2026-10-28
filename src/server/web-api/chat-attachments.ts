import fs from 'fs/promises'

import { resolveMediaFilePath } from '@/infra/config/storage'
import { resolveMediaSourceUrl } from '@/infra/media/resolveMediaSourceUrl'
import { logger } from '@/infra/utils/logger'
import { CHAT_ASSET_ALLOWED_MIME_TYPES, CHAT_ASSET_MAX_BYTES } from '@/server/chat-assets/constants'
import type { TutorModelPart } from '@/server/services/tutor-chat/model-gateway'

export type AttachmentDoc = Record<string, unknown> & {
  filename?: unknown
  originalFilename?: unknown
  mimeType?: unknown
  filesize?: unknown
  url?: unknown
}

/** An attachment the model was supposed to see but did not receive. */
export type AttachmentFailure = {
  id: string
  name: string
  reason: string
}

/**
 * - `part`: inline data ready for the model.
 * - `skipped`: a file type the model never receives (e.g. video) — not a failure.
 * - `failure`: a supported file that could not be loaded this turn.
 */
export type AttachmentLoadResult =
  | { kind: 'part'; part: TutorModelPart }
  | { kind: 'skipped' }
  | { kind: 'failure'; failure: AttachmentFailure }

const SUPPORTED_INLINE_MIME_TYPES = new Set<string>(CHAT_ASSET_ALLOWED_MIME_TYPES)
const FETCH_TIMEOUT_MS = 30_000
const RETRY_DELAY_MS = 500

class AttachmentFetchError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message)
  }
}

function cleanMimeType(mimeType: unknown) {
  return String(mimeType || '')
    .split(';')[0]
    ?.trim()
    .toLowerCase()
}

export function attachmentName(attachment: AttachmentDoc) {
  return String(
    attachment.originalFilename || attachment.filename || attachment.url || 'attachment',
  )
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function fetchOnce(url: string) {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  } catch (error) {
    // A timeout already spent the full budget; retrying would double the wait.
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    throw new AttachmentFetchError(`fetch error: ${errorMessage(error)}`, !timedOut)
  }
  if (!response.ok) {
    // Cold-starting upstreams (Admin's media proxy) answer 5xx/429 transiently.
    const retryable = response.status >= 500 || response.status === 429
    throw new AttachmentFetchError(`HTTP ${response.status}`, retryable)
  }
  return response
}

async function fetchWithRetry(url: string) {
  try {
    return await fetchOnce(url)
  } catch (error) {
    if (!(error instanceof AttachmentFetchError) || !error.retryable) throw error
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    return fetchOnce(url)
  }
}

async function fetchAttachmentBuffer(attachment: AttachmentDoc) {
  // Media docs uploaded via Admin store a relative proxy URL; a bare fetch of
  // that path from the server has no origin to resolve against.
  const fetchUrl = typeof attachment.url === 'string' ? resolveMediaSourceUrl(attachment.url) : null

  if (fetchUrl) {
    const response = await fetchWithRetry(fetchUrl)
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: cleanMimeType(attachment.mimeType || response.headers.get('content-type')),
    }
  }

  if (typeof attachment.filename === 'string' && attachment.filename) {
    return {
      buffer: await fs.readFile(resolveMediaFilePath(attachment.filename)),
      mimeType: cleanMimeType(attachment.mimeType),
    }
  }

  return null
}

async function loadAttachmentData(
  attachment: AttachmentDoc,
): Promise<{ part: TutorModelPart } | { reason: string } | null> {
  if (!SUPPORTED_INLINE_MIME_TYPES.has(cleanMimeType(attachment.mimeType))) return null
  if (Number(attachment.filesize || 0) > CHAT_ASSET_MAX_BYTES) return { reason: 'too large' }

  const loaded = await fetchAttachmentBuffer(attachment)
  if (!loaded) return { reason: 'no fetchable source' }
  if (!SUPPORTED_INLINE_MIME_TYPES.has(loaded.mimeType)) {
    return { reason: `unexpected content type ${loaded.mimeType || 'unknown'}` }
  }
  if (loaded.buffer.length > CHAT_ASSET_MAX_BYTES) return { reason: 'too large' }

  return {
    part: { inlineData: { mimeType: loaded.mimeType, data: loaded.buffer.toString('base64') } },
  }
}

/** Load one attachment as inline model data, reporting why when it can't be. */
export async function loadAttachmentPart(attachment: AttachmentDoc): Promise<AttachmentLoadResult> {
  const failure = (reason: string): AttachmentLoadResult => ({
    kind: 'failure',
    failure: { id: String(attachment._id ?? ''), name: attachmentName(attachment), reason },
  })

  try {
    const result = await loadAttachmentData(attachment)
    if (!result) return { kind: 'skipped' }
    if ('reason' in result) return failure(result.reason)
    return { kind: 'part', part: result.part }
  } catch (error) {
    return failure(errorMessage(error))
  }
}

/**
 * Prompt text telling the model which files it cannot see. Without this the
 * model answers from the filename alone and invents a plausible exercise —
 * the "asked about exercise 6, got an unrelated function" bug.
 */
export function missingAttachmentNotice(failures: AttachmentFailure[]) {
  if (failures.length === 0) return ''
  const names = failures.map((failure) => `"${failure.name}"`).join(', ')
  return [
    `IMPORTANT: These files could not be loaded for this turn and you cannot see their contents: ${names}.`,
    'Do not quote, reconstruct, or guess any question, exercise, function, or figure from them.',
    'If the student asks about their contents, say the file could not be loaded right now and ask',
    'them to try again in a moment, or to paste or photograph the exercise.',
  ].join(' ')
}

export function logAttachmentFailures(
  failures: AttachmentFailure[],
  context: { ownerId: string; lessonId?: string },
) {
  if (failures.length === 0) return
  logger.warn(
    { ...context, failures },
    'Tutor chat attachments could not be loaded; model will not see them',
  )
}

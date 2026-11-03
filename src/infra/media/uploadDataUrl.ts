/**
 * @fileType utility
 * @domain media
 * @pattern client-upload
 * @ai-summary Convert a PNG/data-URL blob into a Payload media doc via `/api/media` and return the new media id.
 */

/**
 * Upload a base64 data URL (e.g. from a `<canvas>.toDataURL('image/png')`
 * call) to `/api/media` and return the created Payload media document id.
 *
 * WHY this exists in `infra/media` rather than a chat hook: two independent
 * chat surfaces (the interactive-view `useNotebookChat` and the chat-lesson
 * `ChatLessonRunnerView` bridge) need to turn a drawing into an attachable
 * media id. Centralising the decode + upload keeps them from drifting.
 *
 * Throws with a descriptive message on any failure (malformed URL, upload
 * rejected, missing id in response) so callers can log + surface a toast
 * without swallowing the reason.
 */
export async function uploadDataUrlAsMedia(dataUrl: string, filename: string): Promise<string> {
  return uploadFileAsMedia(dataUrlToFile(dataUrl, filename))
}

/**
 * Same as {@link uploadDataUrlAsMedia}, but also returns the stored file's
 * URL — for callers that display the upload themselves (notebook cuts).
 */
export async function uploadDataUrlAsMediaDoc(
  dataUrl: string,
  filename: string,
): Promise<UploadedMedia> {
  return postMediaFile(dataUrlToFile(dataUrl, filename))
}

export interface UploadedMedia {
  id: string
  url: string
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(',')
  if (!header || data === undefined) {
    throw new Error('Malformed data URL')
  }
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  let binary: string
  try {
    binary = atob(data)
  } catch (error) {
    throw new Error(
      `Malformed base64 payload in data URL: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([new Blob([bytes], { type: mime })], filename, { type: mime })
}

/**
 * Upload a `File` (from an `<input type="file">` or drag/drop) to
 * `/api/media` and return the created Payload media document id. Shares
 * the response-shape handling with `uploadDataUrlAsMedia` above.
 */
export async function uploadFileAsMedia(file: File): Promise<string> {
  return (await postMediaFile(file)).id
}

async function postMediaFile(file: File): Promise<UploadedMedia> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('/api/media', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Media upload failed (${response.status})`)
  }

  // Payload returns `{ doc: { id, ... } }` on create — the `?? doc.id`
  // fallback covers older response shapes without breaking on refactor.
  const doc = (await response.json()) as {
    doc?: { id?: string; url?: string }
    id?: string
    url?: string
  }
  const mediaId = doc.doc?.id ?? doc.id
  if (!mediaId) {
    throw new Error('Media upload succeeded but returned no id')
  }
  return { id: mediaId, url: doc.doc?.url ?? doc.url ?? '' }
}

export interface ExerciseFile {
  id: number
  title: string
  url: string
  date: string
  /** Media ID from /api/media upload — allows the chat to reference this image */
  mediaId?: string
  /** True while the image is being uploaded to /api/media */
  isUploading?: boolean
  /** MIME type of the uploaded file (e.g. 'image/jpeg', 'application/pdf') */
  mimeType?: string
  /**
   * Server-side filename returned by the upload (used to build a same-origin
   * `/api/media/file/<filename>` URL for the PDF preview — direct Vercel Blob
   * URLs fail PDF.js's cross-origin fetch inside the viewer iframe).
   */
  filename?: string
}

export interface AskActionEvent {
  type: 'hint' | 'solution' | 'check'
  title: string
  imageData?: string
  /** Media ID of the exercise image so the AI can see it */
  mediaId?: string
  /**
   * For PDF-backed exercises on `check`: the currently rendered PDF page
   * captured as a PNG data URL, plus the 1-based page number the student
   * was viewing. When present, the chat routes the check through a
   * PDF-aware prompt that scopes exercise matching to this single page.
   */
  pdfPageImage?: string
  pdfPageNumber?: number
}

export interface AskMediaAttachEvent {
  mediaId: string
  filename: string
}

export interface AskMediaRestoreEvent {
  mediaId: string
  filename: string
  url: string
  /**
   * MIME type of the restored file. Required for PDFs so the Ask page
   * routes them into `AskPdfWorkspace` (viewer + FloatingNotebook) instead
   * of the image exercise card. Optional for backwards compatibility with
   * the existing conversation-history restore path, which doesn't track
   * MIME type.
   */
  mimeType?: string
}

/**
 * Emitted by the interactive-lesson player when the viewed step changes.
 * `detail` is null when the player is reset / no lesson is active.
 */
export interface AskStepContextEvent {
  currentStepId: number
  totalSteps: number
  stepTitle: string
  stepNarration: string
}

export const ASK_ACTION_EVENT = 'ask-action' as const
export const ASK_MEDIA_ATTACH_EVENT = 'ask-media-attach' as const
export const ASK_MEDIA_RESTORE_EVENT = 'ask-media-restore' as const
export const ASK_MEDIA_CLEAR_EVENT = 'ask-media-clear' as const
export const ASK_STEP_CONTEXT_EVENT = 'ask-step-context' as const

/**
 * `sessionStorage` key prefix for the drop-to-ask handoff. The payload is
 * keyed by the conversation's `contextKey` so each Ask "room" has its own
 * slot — this lets the dropped file survive the sibling-tree remount that
 * `SplitPaneLayout` triggers whenever the viewport crosses the
 * desktop/mobile breakpoint (e.g. DevTools open/close), without one room
 * accidentally picking up another room's pending drop. Written by the
 * course composer just before `router.push('/ask?…')` and read on every
 * mount of `AskPrimaryContent` — not removed until the user explicitly
 * clears the media.
 */
export const ASK_PENDING_MEDIA_KEY_PREFIX = 'aguy:askPendingMedia:' as const

export function getAskPendingMediaKey(contextKey: string): string {
  return `${ASK_PENDING_MEDIA_KEY_PREFIX}${contextKey}`
}

export interface AskPendingMediaPayload {
  mediaId: string
  filename: string
  mimeType: string
  url: string
}

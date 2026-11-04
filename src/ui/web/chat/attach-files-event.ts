/**
 * @fileType utility
 * @domain chat
 * @ai-summary Window event that puts files into the chat composer as ordinary attachments (the same chips as the paperclip picker), for features outside the chat such as notebook cuts. The student then sends them with their own message.
 */

export const CHAT_ATTACH_FILES_EVENT = 'chat-attach-files' as const

export interface ChatAttachFilesDetail {
  files: File[]
}

/** Attach files to whichever chat is mounted on the page, and bring it into view. */
export function attachFilesToChat(files: File[]): void {
  window.dispatchEvent(
    new CustomEvent<ChatAttachFilesDetail>(CHAT_ATTACH_FILES_EVENT, { detail: { files } }),
  )
}

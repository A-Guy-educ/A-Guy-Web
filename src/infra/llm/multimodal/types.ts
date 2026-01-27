/**
 * Multimodal Types for Chat Media
 * Types for handling media attachments in chat messages
 */

export type MediaPartType = 'image' | 'pdf'

export interface MediaPartWithPath {
  mediaId: string
  type: MediaPartType
  absoluteFilePath: string
  publicUrl: string
  mimeType: string
}

export interface MediaValidationResult {
  valid: boolean
  mediaItems: Array<{
    mediaId: string
    type: MediaPartType
    mimeType: string
    error?: string
  }>
  hasUnsupportedMedia: boolean
}

export interface MultimodalInput {
  text: string
  mediaPartsWithPath: MediaPartWithPath[]
}

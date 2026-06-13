/**
 * Multimodal Types for Chat Media
 *
 * @ai-summary Pure data types for chat media attachments. No business logic —
 * interfaces used across chat service, data extractor, and media reader to keep
 * the shape consistent without circular dependencies.
 */

export type MediaPartType = 'image' | 'pdf'

export interface MediaPartWithPath {
  mediaId: string
  type: MediaPartType
  absoluteFilePath: string
  publicUrl: string
  mimeType: string
}

export interface MediaItemResult {
  mediaId: string
  type: MediaPartType
  mimeType: string
  error?: string
}

export interface MediaValidationResult {
  valid: boolean
  mediaItems: MediaItemResult[]
  hasUnsupportedMedia: boolean
}

export interface MultimodalInput {
  text: string
  mediaPartsWithPath: MediaPartWithPath[]
}

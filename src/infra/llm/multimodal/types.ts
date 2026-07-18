/**
 * Multimodal Types for Chat Media
 *
 * @ai-summary Pure data types for chat media attachments. No business logic —
 * interfaces used across chat service, data extractor, and media reader to keep
 * the shape consistent without circular dependencies. Shared shape between multimodal mappers and media-validation. MediaPartWithPath is the central type — it carries both the resolved filesystem path and the publicUrl so the reader can try filesystem first (local dev) and fall back to URL fetch (serverless).
 *
 * @fileType types
 * @domain ai
 * @pattern data-transfer
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

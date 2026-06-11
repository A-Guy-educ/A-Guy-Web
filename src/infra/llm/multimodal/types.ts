/**
 * Multimodal media attachment types
 *
 * @ai-summary Defines `MediaPartWithPath` which carries both the resolved filesystem path and the public URL — the reader chooses which to use based on environment (fs for local, URL for serverless).
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

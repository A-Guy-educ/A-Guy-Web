/**
 * Gemini Multimodal Mapper
 * Uses resolved paths from validation (no extra DB queries)
 */
import type { Part } from '@google/generative-ai'
import fs from 'fs/promises'

import { logger } from '@/infra/utils/logger'
import type { MediaPartWithPath } from '@/infra/llm/multimodal/types'

/**
 * Convert validated media parts to Gemini format
 * Returns parts array ready to be included in Gemini content
 */
export async function mapMultimodalToGemini(
  mediaPartsWithPath: MediaPartWithPath[],
): Promise<{ currentMessage: Part[] }> {
  const currentParts: Part[] = []

  logger.info(
    { mediaCount: mediaPartsWithPath.length, mediaParts: mediaPartsWithPath },
    '[MultimodalMapper] Processing media parts',
  )

  for (const mediaPart of mediaPartsWithPath) {
    const geminiPart = await convertMediaToGeminiPart(mediaPart)
    if (geminiPart) {
      currentParts.push(geminiPart)
      logger.info(
        { mediaId: mediaPart.mediaId },
        '[MultimodalMapper] Successfully converted media to Gemini part',
      )
    } else {
      logger.warn(
        { mediaId: mediaPart.mediaId },
        '[MultimodalMapper] Failed to convert media - returned null',
      )
    }
  }

  logger.info(
    { inputCount: mediaPartsWithPath.length, outputCount: currentParts.length },
    '[MultimodalMapper] Finished processing',
  )

  return { currentMessage: currentParts }
}

/**
 * Convert a single media part to Gemini inline data format
 * Uses HTTP fetch for serverless compatibility (Vercel)
 */
async function convertMediaToGeminiPart(mediaPart: MediaPartWithPath): Promise<Part | null> {
  const { absoluteFilePath, publicUrl, mimeType, mediaId } = mediaPart

  logger.info({ mediaId, absoluteFilePath, mimeType }, '[MultimodalMapper] Reading file for Gemini')

  try {
    // Try filesystem first (local dev), fallback to HTTP (serverless)
    let fileBuffer: Buffer

    try {
      fileBuffer = await fs.readFile(absoluteFilePath)
      logger.info(
        { mediaId, fileSize: fileBuffer.length, method: 'fs' },
        '[MultimodalMapper] File read via filesystem',
      )
    } catch (_fsError) {
      // Filesystem failed (likely serverless), fetch via HTTP
      logger.info({ mediaId, publicUrl }, '[MultimodalMapper] Filesystem failed, fetching via HTTP')

      const response = await fetch(publicUrl)
      if (!response.ok) {
        throw new Error(`HTTP fetch failed: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)
      logger.info(
        { mediaId, fileSize: fileBuffer.length, method: 'http' },
        '[MultimodalMapper] File fetched via HTTP',
      )
    }

    const base64 = fileBuffer.toString('base64')
    logger.info(
      { mediaId, fileSize: fileBuffer.length, base64Length: base64.length },
      '[MultimodalMapper] File read successfully',
    )

    return {
      inlineData: {
        data: base64,
        mimeType,
      },
    }
  } catch (error) {
    logger.error(
      { err: error, mediaId, absoluteFilePath, publicUrl },
      '[MultimodalMapper] Failed to read media file for Gemini',
    )
    return null
  }
}

/**
 * Check if a media type is supported by Gemini multimodal
 */
export function isMediaTypeSupported(type: 'image' | 'pdf'): boolean {
  return ['image', 'pdf'].includes(type)
}

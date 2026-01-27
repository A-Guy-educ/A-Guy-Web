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

  for (const mediaPart of mediaPartsWithPath) {
    const geminiPart = await convertMediaToGeminiPart(mediaPart)
    if (geminiPart) {
      currentParts.push(geminiPart)
    }
  }

  return { currentMessage: currentParts }
}

/**
 * Convert a single media part to Gemini inline data format
 */
async function convertMediaToGeminiPart(mediaPart: MediaPartWithPath): Promise<Part | null> {
  const { absoluteFilePath, mimeType, mediaId } = mediaPart

  try {
    const fileBuffer = await fs.readFile(absoluteFilePath)
    const base64 = fileBuffer.toString('base64')

    return {
      inlineData: {
        data: base64,
        mimeType,
      },
    }
  } catch (error) {
    logger.error({ err: error, mediaId, absoluteFilePath }, 'Failed to read media file for Gemini')
    return null
  }
}

/**
 * Check if a media type is supported by Gemini multimodal
 */
export function isMediaTypeSupported(type: 'image' | 'pdf'): boolean {
  return ['image', 'pdf'].includes(type)
}

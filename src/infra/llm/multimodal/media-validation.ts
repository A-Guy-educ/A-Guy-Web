/**
 * Media Validation for Chat Messages
 * Validates media exists, belongs to tenant, not expired, valid type/size
 * Returns resolved paths for Gemini mapper (no extra DB lookups)
 */
import type { Payload } from 'payload'

import { resolveMediaFilePath, resolveMediaPublicUrl } from '@/lib/config/storage'
import { MediaType } from '@/infra/media/types'
import { logger } from '@/infra/utils/logger'

import type { MediaPartType, MediaPartWithPath, MediaValidationResult } from './types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_ATTACHMENTS = 5
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const SUPPORTED_TYPES = [MediaType.Image, MediaType.PDF]

export async function validateChatMedia(
  payload: Payload,
  mediaIds: string[],
  userId: string,
  tenantId: string,
): Promise<MediaValidationResult & { mediaPartsWithPath: MediaPartWithPath[] }> {
  const reqLogger = logger.child({ mediaIds, userId, tenantId })
  const result: MediaValidationResult = {
    valid: true,
    mediaItems: [],
    hasUnsupportedMedia: false,
  }
  const mediaPartsWithPath: MediaPartWithPath[] = []

  // Server-side enforcement: max 5 attachments
  if (mediaIds.length > MAX_ATTACHMENTS) {
    result.valid = false
    result.mediaItems.push({
      mediaId: 'all',
      type: 'image',
      mimeType: '',
      error: `Maximum ${MAX_ATTACHMENTS} attachments allowed`,
    })
    return { ...result, mediaPartsWithPath }
  }

  if (mediaIds.length === 0) {
    return { ...result, mediaPartsWithPath }
  }

  // DB-level tenant filter (safe - cannot leak cross-tenant)
  const mediaDocs = await payload.find({
    collection: 'media',
    where: {
      and: [{ id: { in: mediaIds } }, { tenant: { equals: tenantId } }],
    },
    limit: mediaIds.length,
    depth: 0,
    overrideAccess: true,
  })

  const foundIds = new Set(mediaDocs.docs.map((doc) => doc.id))

  // Check for missing IDs
  for (const mediaId of mediaIds) {
    if (!foundIds.has(mediaId)) {
      result.valid = false
      result.mediaItems.push({
        mediaId,
        type: 'image',
        mimeType: '',
        error: 'Media not found or access denied',
      })
      reqLogger.warn({ mediaId }, 'Media not found or wrong tenant')
    }
  }

  // Process each found document
  for (const doc of mediaDocs.docs) {
    const mediaId = doc.id as string
    const filename = doc.filename as string | undefined
    const mimeType = doc.mimeType || 'unknown'

    // VALIDATION: Check for missing filename
    if (!filename) {
      result.valid = false
      result.mediaItems.push({
        mediaId,
        type: 'image',
        mimeType,
        error: 'Media record missing filename',
      })
      reqLogger.warn({ mediaId }, 'Media record has no filename')
      continue
    }

    // Check expiry
    if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
      result.valid = false
      result.mediaItems.push({
        mediaId,
        type: 'image', // Best guess
        mimeType,
        error: 'Media has expired',
      })
      continue
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      result.hasUnsupportedMedia = true
      result.mediaItems.push({
        mediaId,
        type: 'image',
        mimeType,
        error: `Unsupported MIME type: ${mimeType}`,
      })
      continue
    }

    // Check file size
    if ((doc.filesize || 0) > MAX_FILE_SIZE) {
      result.valid = false
      result.mediaItems.push({
        mediaId,
        type: 'image',
        mimeType,
        error: `File size exceeds 10MB limit`,
      })
      continue
    }

    // Check supported type
    const docType = doc.type as MediaType | undefined
    const isSupportedType = docType && SUPPORTED_TYPES.includes(docType)
    const mediaPartType: MediaPartType = docType === MediaType.PDF ? 'pdf' : 'image'

    if (!isSupportedType) {
      result.hasUnsupportedMedia = true
      result.mediaItems.push({
        mediaId,
        type: 'image',
        mimeType,
        error: `Unsupported media type: ${docType || 'unknown'}`,
      })
      continue
    }

    // Resolve paths for Gemini mapper
    try {
      const absoluteFilePath = resolveMediaFilePath(filename)
      const publicUrl = resolveMediaPublicUrl(filename)

      mediaPartsWithPath.push({
        mediaId,
        type: mediaPartType,
        absoluteFilePath,
        publicUrl,
        mimeType,
      })
    } catch (_error) {
      result.valid = false
      result.mediaItems.push({
        mediaId,
        type: 'image',
        mimeType,
        error: 'Invalid media path configuration',
      })
    }
  }

  return { ...result, mediaPartsWithPath }
}

/**
 * Set ephemeral retention on validated media
 * Tenant-safe: only patches media that was validated for this tenant
 * Optimized: single read query + per-doc updates for non-ephemeral
 */
export async function setEphemeralRetention(
  payload: Payload,
  mediaPartsWithPath: MediaPartWithPath[],
  req?: { context?: Record<string, unknown> },
): Promise<void> {
  if (mediaPartsWithPath.length === 0) return

  const mediaIds = mediaPartsWithPath.map((p) => p.mediaId)

  // Single read to get current states
  const docs = await payload.find({
    collection: 'media',
    where: {
      id: { in: mediaIds },
    },
    limit: mediaIds.length,
    depth: 0,
    overrideAccess: true,
  })

  const needsUpdate = docs.docs.filter((doc) => doc.retentionPolicy !== 'ephemeral')
  if (needsUpdate.length === 0) return

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const context = { ...req?.context, allowRetentionPatch: true }

  // Update only those that need it
  for (const doc of needsUpdate) {
    await payload.update({
      collection: 'media',
      id: doc.id,
      data: {
        retentionPolicy: 'ephemeral',
        expiresAt,
      },
      context,
    })
  }
}

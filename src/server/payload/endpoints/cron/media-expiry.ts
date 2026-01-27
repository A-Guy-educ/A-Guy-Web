/**
 * POST /api/cron/media-expiry
 * Cleanup endpoint for expired ephemeral media
 *
 * @fileType endpoint
 * @domain media
 * @pattern cron-endpoint, authenticated-endpoint
 * @ai-summary Deletes expired ephemeral media files and database records
 *
 * Access: Requires CRON_SECRET bearer token
 *
 * Features:
 * - Finds all ephemeral media where expiresAt < now
 * - Deletes files from filesystem (best effort)
 * - Deletes database records (authoritative)
 * - Returns deletion stats for monitoring
 */
import type { Endpoint } from 'payload'
import fs from 'fs/promises'

import { resolveMediaFilePath } from '@/lib/config/storage'
import { logger } from '@/infra/utils/logger'

const CRON_SECRET = process.env.CRON_SECRET

export const mediaExpiryCleanupEndpoint: Endpoint = {
  path: '/cron/media-expiry',
  method: 'post',
  handler: async (req) => {
    const requestId = crypto.randomUUID()
    const reqLogger = logger.child({ requestId })

    // Authenticate
    const authHeader = req.headers?.get('authorization')
    if (!CRON_SECRET || !authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      reqLogger.warn('Unauthorized cron request')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const now = new Date().toISOString()
      let deletedCount = 0
      let failedCount = 0
      const fileDeleteFailures: string[] = []
      const dbDeleteFailures: string[] = []

      // Find expired ephemeral media
      const expiredMedia = await req.payload.find({
        collection: 'media',
        where: {
          and: [
            { retentionPolicy: { equals: 'ephemeral' } },
            { expiresAt: { less_than_equal: now } },
          ],
        },
        limit: 100,
        depth: 0,
        overrideAccess: true,
      })

      reqLogger.info({ count: expiredMedia.docs.length }, 'Found expired media to delete')

      for (const media of expiredMedia.docs) {
        const filename = media.filename as string | undefined
        const mediaId = media.id as string

        try {
          // Best-effort file deletion first (best effort, log failures)
          if (filename) {
            try {
              const filePath = resolveMediaFilePath(filename)
              await fs.unlink(filePath)
              reqLogger.debug({ filename }, 'Deleted file from filesystem')
            } catch (fileError) {
              // File may not exist or already deleted - log but continue
              fileDeleteFailures.push(`${mediaId}: ${(fileError as Error).message}`)
              reqLogger.debug({ filename, err: fileError }, 'File deletion skipped/failed')
            }
          }

          // Authoritative DB deletion
          await req.payload.delete({
            collection: 'media',
            id: mediaId,
            overrideAccess: true,
          })

          deletedCount++
          reqLogger.info({ mediaId, filename }, 'Deleted expired media')
        } catch (error) {
          failedCount++
          const errorMsg = error instanceof Error ? error.message : String(error)
          dbDeleteFailures.push(`${mediaId}: ${errorMsg}`)
          reqLogger.error({ mediaId, error: errorMsg }, 'Failed to delete media')
        }
      }

      return Response.json({
        success: true,
        deletedCount,
        failedCount,
        hasMore: expiredMedia.totalDocs > deletedCount + failedCount,
        // Include failure details for monitoring orphan files
        fileDeleteFailures: fileDeleteFailures.length > 0 ? fileDeleteFailures : undefined,
        dbDeleteFailures: dbDeleteFailures.length > 0 ? dbDeleteFailures : undefined,
        timestamp: now,
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      reqLogger.error({ error: errorMsg }, 'Media cleanup failed')
      return Response.json({ error: 'Cleanup failed' }, { status: 500 })
    }
  },
}

/**
 * Shared Storage Configuration
 * Single source of truth for media paths - mirrors existing Payload upload config
 *
 * CRITICAL: These values MUST match Payload's existing upload.staticDir
 */
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Use same resolution pattern as Payload's upload.staticDir
// From src/lib/config -> ../../public/media
const MEDIA_SUBDIR = path.resolve(dirname, '../../public/media')

/**
 * Absolute path to local media storage directory
 * MUST match Payload's upload.staticDir
 */
export const MEDIA_STORAGE_DIR = MEDIA_SUBDIR

/**
 * Public URL path prefix for media files
 * Inferred from storage pattern (usually /media)
 */
export const MEDIA_PUBLIC_URL = '/media'

/**
 * Resolve absolute filesystem path for a media file
 */
export function resolveMediaFilePath(filename: string): string {
  if (!filename) {
    throw new Error('Filename is required to resolve media path')
  }
  return path.resolve(MEDIA_STORAGE_DIR, filename)
}

/**
 * Resolve public URL for a media file
 */
export function resolveMediaPublicUrl(filename: string, baseUrl?: string): string {
  if (!filename) {
    throw new Error('Filename is required to resolve media URL')
  }
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  return `${base}${MEDIA_PUBLIC_URL}/${filename}`
}

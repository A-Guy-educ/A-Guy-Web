/**
 * Media Blob Lookup
 *
 * @fileType service
 * @domain media
 * @ai-summary Finds the Vercel Blob URL for a media file name. Media docs only store a relative `/api/media/file/<name>` path, so both the media route and the tutor chat resolve the real storage address here.
 */

import { VercelBlobAdapter } from '@/infra/blob/vercel-blob-adapter'

export type MediaBlobRecord = {
  pathname?: unknown
}

export function withoutGeneratedSuffix(filename: string): string {
  return filename.replace(/-[a-zA-Z0-9]{20,}(\.[^.]+)$/, '$1')
}

function getBlobLookupPrefixes(filename: string, media: MediaBlobRecord | null): string[] {
  const originalFilename = withoutGeneratedSuffix(filename)
  const prefixes = [
    typeof media?.pathname === 'string' ? media.pathname.replace(/^\/+/, '') : null,
    `media/${filename}`,
    `media/pdfs/${filename}`,
    filename,
    `media/${originalFilename}`,
    `media/pdfs/${originalFilename}`,
    originalFilename,
  ]

  return prefixes.filter((prefix, index): prefix is string => {
    return Boolean(prefix) && prefixes.indexOf(prefix) === index
  })
}

/** Returns the public Blob URL for `filename`, or null when it isn't in this app's store. */
export async function findBlobUrl(
  filename: string,
  media: MediaBlobRecord | null,
): Promise<string | null> {
  try {
    const blob = new VercelBlobAdapter({ directory: '' })
    const prefixes = getBlobLookupPrefixes(filename, media)
    const originalFilename = withoutGeneratedSuffix(filename)
    const knownPathnames = new Set([
      filename,
      originalFilename,
      `media/${filename}`,
      `media/${originalFilename}`,
      `media/pdfs/${filename}`,
      `media/pdfs/${originalFilename}`,
    ])

    for (const prefix of prefixes) {
      const result = await blob.list(prefix, 5)
      const match =
        result.blobs.find((item) => item.pathname === prefix) ||
        result.blobs.find((item) => knownPathnames.has(item.pathname)) ||
        result.blobs.find((item) => item.pathname.startsWith(prefix))

      if (match?.url) return match.url
    }
  } catch {
    return null
  }

  return null
}

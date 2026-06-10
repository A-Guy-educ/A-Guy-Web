import fs from 'fs/promises'

import { NextRequest, NextResponse } from 'next/server'

import { resolveMediaFilePath } from '@/infra/config/storage'
import { getContentDb } from '@/infra/db/content-db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  const db = await getContentDb()
  const media = await db.collection('media').findOne({ filename })
  if (media?.url && typeof media.url === 'string') {
    return NextResponse.redirect(media.url)
  }

  try {
    const file = await fs.readFile(resolveMediaFilePath(filename))
    return new NextResponse(file, {
      headers: {
        'Content-Type': String(media?.mimeType || 'application/octet-stream'),
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}

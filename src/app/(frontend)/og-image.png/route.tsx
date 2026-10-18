/**
 * Open Graph image route — 1200x630 PNG rendered via next/og.
 *
 * Replaces the Payload "Website Template" image that used to ship under
 * public/. Keeping the URL at a stable path (not the file-convention hash)
 * so brand config and shared pages can reference it directly.
 *
 * @fileType api-route
 * @domain seo
 */

import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

import { getBrandSlug } from '@/brands'

export const dynamic = 'force-static'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export async function GET() {
  const brandSlug = getBrandSlug()
  const telescopeSvg = await readFile(
    join(process.cwd(), 'src', 'brands', brandSlug, 'assets', 'telescope.svg'),
    'utf-8',
  )
  const telescopeDataUri = `data:image/svg+xml;base64,${Buffer.from(telescopeSvg).toString('base64')}`

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        gap: 48,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={telescopeDataUri} width={320} height={320} alt="" />
      <div
        style={{
          fontSize: 160,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: -4,
          lineHeight: 1,
        }}
      >
        A-Guy
      </div>
    </div>,
    { ...size },
  )
}

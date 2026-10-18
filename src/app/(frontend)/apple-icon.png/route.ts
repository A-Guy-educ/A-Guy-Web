/**
 * Apple Touch Icon route — serves the brand's favicon as SVG at the
 * traditional /apple-icon.png URL. iOS 15+ accepts SVG apple-touch-icons;
 * older iOS falls back to the generic icon.
 *
 * @fileType api-route
 * @domain brands
 * @ai-summary Serves the brand favicon SVG for the apple-touch-icon URL.
 */

import { getBrandSlug } from '@/brands'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-static'

export async function GET() {
  const brandSlug = getBrandSlug()
  const filePath = join(process.cwd(), 'src', 'brands', brandSlug, 'assets', 'favicon.svg')
  const file = await readFile(filePath)

  return new Response(file, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

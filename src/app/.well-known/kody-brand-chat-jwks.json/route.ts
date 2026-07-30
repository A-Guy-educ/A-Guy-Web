import { NextResponse } from 'next/server'

import { createKodyBrandChatPublicJwks } from '@/infra/auth/kody-brand-chat/assertion'
import { getKodyBrandChatConfig } from '@/infra/auth/kody-brand-chat/config'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const config = getKodyBrandChatConfig()
    const jwks = await createKodyBrandChatPublicJwks(config)
    return NextResponse.json(jwks, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'identity_keys_unavailable' }, { status: 503 })
  }
}

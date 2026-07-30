import { NextRequest, NextResponse } from 'next/server'

import { createKodyBrandChatAssertion } from '@/infra/auth/kody-brand-chat/assertion'
import { getKodyBrandChatConfig } from '@/infra/auth/kody-brand-chat/config'
import { renderKodyBrandChatLaunchPage } from '@/infra/auth/kody-brand-chat/launch-page'
import { requireUser } from '@/server/auth/api-auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let config
  try {
    config = getKodyBrandChatConfig()
  } catch {
    return NextResponse.json({ error: 'brand_chat_unavailable' }, { status: 503 })
  }

  const origin = request.headers.get('origin')
  if (!origin || origin !== config.issuer) {
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 })
  }

  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  try {
    const assertion = await createKodyBrandChatAssertion({ subject: auth.value.id }, config)
    const page = renderKodyBrandChatLaunchPage(config, assertion)
    const launchOrigin = new URL(config.launchUrl).origin
    return new NextResponse(page.html, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy':
          `default-src 'none'; script-src 'nonce-${page.nonce}'; ` +
          `form-action ${launchOrigin}; base-uri 'none'; frame-ancestors 'none'`,
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'brand_chat_unavailable' }, { status: 503 })
  }
}

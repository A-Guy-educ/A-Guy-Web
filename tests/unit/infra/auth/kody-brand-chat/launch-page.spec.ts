import { describe, expect, it } from 'vitest'

import { renderKodyBrandChatLaunchPage } from '@/infra/auth/kody-brand-chat/launch-page'
import type { KodyBrandChatConfig } from '@/infra/auth/kody-brand-chat/config'

const CONFIG: KodyBrandChatConfig = {
  issuer: 'https://learn.a-guy.com',
  audience: 'kody-brand-chat',
  launchUrl: 'https://dashboard.example/api/client-session/external-launch',
  target: {
    owner: 'A-Guy-educ',
    repo: 'A-Guy-Teacher',
    brandSlug: 'acme',
  },
  privateKeyPkcs8: 'private',
  keyId: 'key-1',
}

describe('Kody Brand Chat launch page', () => {
  it('auto-posts the JWT to the fixed Kody endpoint without putting it in the URL', () => {
    const { html, nonce } = renderKodyBrandChatLaunchPage(CONFIG, 'header.payload.signature', {
      nonce: 'test-nonce',
    })

    expect(nonce).toBe('test-nonce')
    expect(html).toContain('method="post"')
    expect(html).toContain(`action="${CONFIG.launchUrl}"`)
    expect(html).toContain('name="assertion" value="header.payload.signature"')
    expect(html).toContain('name="owner" value="A-Guy-educ"')
    expect(html).toContain('name="repo" value="A-Guy-Teacher"')
    expect(html).toContain('name="brandSlug" value="acme"')
    expect(html).toContain('nonce="test-nonce"')
    expect(html).not.toContain('?assertion=')
  })

  it('generates a fresh CSP nonce when the caller does not provide one', () => {
    const first = renderKodyBrandChatLaunchPage(CONFIG, 'first.jwt.value')
    const second = renderKodyBrandChatLaunchPage(CONFIG, 'second.jwt.value')

    expect(first.nonce).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(second.nonce).not.toBe(first.nonce)
  })
})

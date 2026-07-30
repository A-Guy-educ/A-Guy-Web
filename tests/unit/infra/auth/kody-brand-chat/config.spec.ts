import { describe, expect, it } from 'vitest'

import { getKodyBrandChatConfig } from '@/infra/auth/kody-brand-chat/config'

const PRIVATE_KEY =
  '-----BEGIN PRIVATE KEY-----\\n' + 'a'.repeat(80) + '\\n-----END PRIVATE KEY-----'

const VALID_ENV = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_SERVER_URL: 'https://learn.a-guy.com',
  KODY_BRAND_CHAT_LAUNCH_URL: 'https://kody-dashboard.example/api/client-session/external-launch',
  KODY_BRAND_CHAT_TARGET: 'A-Guy-educ/A-Guy-Teacher/acme',
  KODY_BRAND_CHAT_PRIVATE_KEY: PRIVATE_KEY,
  KODY_BRAND_CHAT_KEY_ID: 'aguy-web-2026-01',
}

describe('Kody Brand Chat configuration', () => {
  it('builds one explicit host-to-brand trust contract', () => {
    expect(getKodyBrandChatConfig(VALID_ENV)).toEqual({
      issuer: 'https://learn.a-guy.com',
      audience: 'kody-brand-chat',
      launchUrl: 'https://kody-dashboard.example/api/client-session/external-launch',
      target: {
        owner: 'A-Guy-educ',
        repo: 'A-Guy-Teacher',
        brandSlug: 'acme',
      },
      privateKeyPkcs8:
        '-----BEGIN PRIVATE KEY-----\n' + 'a'.repeat(80) + '\n-----END PRIVATE KEY-----',
      keyId: 'aguy-web-2026-01',
    })
  })

  it('rejects insecure production endpoints', () => {
    expect(() =>
      getKodyBrandChatConfig({
        ...VALID_ENV,
        KODY_BRAND_CHAT_LAUNCH_URL: 'http://kody.example/api/client-session/external-launch',
      }),
    ).toThrow('HTTPS')
  })

  it('rejects an ambiguous target', () => {
    expect(() =>
      getKodyBrandChatConfig({
        ...VALID_ENV,
        KODY_BRAND_CHAT_TARGET: 'A-Guy-educ/acme',
      }),
    ).toThrow('target')
  })
})

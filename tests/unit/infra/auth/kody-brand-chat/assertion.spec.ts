import { exportPKCS8, generateKeyPair, jwtVerify } from 'jose'
import { describe, expect, it } from 'vitest'

import {
  createKodyBrandChatAssertion,
  createKodyBrandChatPublicJwks,
} from '@/infra/auth/kody-brand-chat/assertion'
import type { KodyBrandChatConfig } from '@/infra/auth/kody-brand-chat/config'

async function testConfig(): Promise<{
  config: KodyBrandChatConfig
  publicKey: CryptoKey
}> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', {
    extractable: true,
  })
  return {
    config: {
      issuer: 'https://learn.a-guy.com',
      audience: 'kody-brand-chat',
      launchUrl: 'https://dashboard.example/api/client-session/external-launch',
      target: {
        owner: 'A-Guy-educ',
        repo: 'A-Guy-Teacher',
        brandSlug: 'acme',
      },
      privateKeyPkcs8: await exportPKCS8(privateKey),
      keyId: 'test-key',
    },
    publicKey,
  }
}

describe('Kody Brand Chat assertion', () => {
  it('signs a one-minute, brand-scoped JWT containing only an opaque user id', async () => {
    const { config, publicKey } = await testConfig()
    const now = 1_800_000_000

    const token = await createKodyBrandChatAssertion({ subject: 'user-123' }, config, {
      now,
      tokenId: 'launch-123',
    })

    const { payload, protectedHeader } = await jwtVerify(token, publicKey, {
      algorithms: ['ES256'],
      issuer: config.issuer,
      audience: config.audience,
      currentDate: new Date(now * 1000),
    })
    expect(protectedHeader).toMatchObject({
      alg: 'ES256',
      kid: 'test-key',
    })
    expect(payload).toMatchObject({
      sub: 'user-123',
      jti: 'launch-123',
      iat: now,
      exp: now + 60,
      tenant_id: 'A-Guy-educ/A-Guy-Teacher',
      brand_slug: 'acme',
    })
    expect(payload).not.toHaveProperty('email')
    expect(payload).not.toHaveProperty('name')
  })

  it('publishes only the matching public key', async () => {
    const { config } = await testConfig()

    const jwks = await createKodyBrandChatPublicJwks(config)

    expect(jwks.keys).toHaveLength(1)
    expect(jwks.keys[0]).toMatchObject({
      alg: 'ES256',
      kid: 'test-key',
      use: 'sig',
      kty: 'EC',
    })
    expect(jwks.keys[0]).not.toHaveProperty('d')
  })

  it('rejects an empty external user id', async () => {
    const { config } = await testConfig()

    await expect(createKodyBrandChatAssertion({ subject: '   ' }, config)).rejects.toThrow(
      'user id',
    )
  })
})

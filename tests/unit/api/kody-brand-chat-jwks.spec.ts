import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  getConfig: vi.fn(),
  createJwks: vi.fn(),
}))

vi.mock('@/infra/auth/kody-brand-chat/config', () => ({
  getKodyBrandChatConfig: h.getConfig,
}))
vi.mock('@/infra/auth/kody-brand-chat/assertion', () => ({
  createKodyBrandChatPublicJwks: h.createJwks,
}))

import { GET } from '@/app/.well-known/kody-brand-chat-jwks.json/route'

describe('GET /.well-known/kody-brand-chat-jwks.json', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.getConfig.mockReturnValue({ keyId: 'key-1' })
    h.createJwks.mockResolvedValue({
      keys: [{ kty: 'EC', kid: 'key-1', use: 'sig', alg: 'ES256' }],
    })
  })

  it('publishes the public verification key with bounded caching', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      keys: [{ kty: 'EC', kid: 'key-1', use: 'sig', alg: 'ES256' }],
    })
    expect(response.headers.get('cache-control')).toContain('max-age=300')
  })

  it('does not expose configuration errors', async () => {
    h.getConfig.mockImplementation(() => {
      throw new Error('private key missing')
    })

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'identity_keys_unavailable',
    })
  })
})

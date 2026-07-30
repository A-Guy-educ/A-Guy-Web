import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getConfig: vi.fn(),
  createAssertion: vi.fn(),
  renderLaunchPage: vi.fn(),
}))

vi.mock('@/server/auth/api-auth', () => ({
  requireUser: h.requireUser,
}))
vi.mock('@/infra/auth/kody-brand-chat/config', () => ({
  getKodyBrandChatConfig: h.getConfig,
}))
vi.mock('@/infra/auth/kody-brand-chat/assertion', () => ({
  createKodyBrandChatAssertion: h.createAssertion,
}))
vi.mock('@/infra/auth/kody-brand-chat/launch-page', () => ({
  renderKodyBrandChatLaunchPage: h.renderLaunchPage,
}))

import { POST } from '@/app/api/kody/brand-chat/launch/route'

const CONFIG = {
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

function request(origin = CONFIG.issuer) {
  return new NextRequest(`${CONFIG.issuer}/api/kody/brand-chat/launch`, {
    method: 'POST',
    headers: {
      origin,
      cookie: 'payload-token=session',
    },
  })
}

describe('POST /api/kody/brand-chat/launch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.requireUser.mockResolvedValue({
      ok: true,
      value: { id: 'user-123' },
    })
    h.getConfig.mockReturnValue(CONFIG)
    h.createAssertion.mockResolvedValue('signed.jwt.value')
    h.renderLaunchPage.mockReturnValue({
      html: '<html>launch</html>',
      nonce: 'page-nonce',
    })
  })

  it('uses the verified A-Guy session id and returns a no-store launch page', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(h.createAssertion).toHaveBeenCalledWith({ subject: 'user-123' }, CONFIG)
    expect(h.renderLaunchPage).toHaveBeenCalledWith(CONFIG, 'signed.jwt.value')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('content-security-policy')).toContain(
      'form-action https://dashboard.example',
    )
    expect(await response.text()).toBe('<html>launch</html>')
  })

  it('rejects callers without a valid A-Guy session', async () => {
    h.requireUser.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(h.createAssertion).not.toHaveBeenCalled()
  })

  it('rejects cross-site POSTs before issuing an assertion', async () => {
    const response = await POST(request('https://attacker.example'))

    expect(response.status).toBe(403)
    expect(h.requireUser).not.toHaveBeenCalled()
    expect(h.createAssertion).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  issueLoginCode: vi.fn(),
  checkLoginCode: vi.fn(),
  sendWhatsAppAuthCode: vi.fn(),
  findUserByVerifiedPhone: vi.fn(),
  createWhatsAppUser: vi.fn(),
}))

vi.mock('@/infra/security/rate-limit', () => ({ rateLimit: mocks.rateLimit }))
vi.mock('@/infra/whatsapp/cloud-api', () => ({
  sendWhatsAppAuthCode: mocks.sendWhatsAppAuthCode,
}))
vi.mock('@/server/services/whatsapp-login/login-codes', () => ({
  issueLoginCode: mocks.issueLoginCode,
  checkLoginCode: mocks.checkLoginCode,
}))
vi.mock('@/infra/auth/web-auth', () => ({
  findUserByVerifiedPhone: mocks.findUserByVerifiedPhone,
  createWhatsAppUser: mocks.createWhatsAppUser,
}))

import {
  requestWhatsAppLoginCode,
  verifyWhatsAppLoginCode,
} from '@/server/services/whatsapp-login/whatsapp-login'

const IP = '203.0.113.7'

describe('requestWhatsAppLoginCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimit.mockResolvedValue({ allowed: true })
    mocks.issueLoginCode.mockResolvedValue('123456')
    mocks.sendWhatsAppAuthCode.mockResolvedValue(undefined)
  })

  it('sends a code to the normalized number', async () => {
    const result = await requestWhatsAppLoginCode({ phone: '050-123-4567', ip: IP })
    expect(result).toEqual({ ok: true, phone: '972501234567' })
    expect(mocks.sendWhatsAppAuthCode).toHaveBeenCalledWith('972501234567', '123456')
  })

  it('rejects numbers it cannot normalize without spending quota', async () => {
    const result = await requestWhatsAppLoginCode({ phone: '+15551234567', ip: IP })
    expect(result).toEqual({ ok: false, error: 'invalidPhone' })
    expect(mocks.rateLimit).not.toHaveBeenCalled()
    expect(mocks.sendWhatsAppAuthCode).not.toHaveBeenCalled()
  })

  it('stops at the first exhausted rate limit and sends nothing', async () => {
    mocks.rateLimit.mockResolvedValueOnce({ allowed: false })
    const result = await requestWhatsAppLoginCode({ phone: '0501234567', ip: IP })
    expect(result).toEqual({ ok: false, error: 'rateLimited' })
    expect(mocks.rateLimit).toHaveBeenCalledTimes(1)
    expect(mocks.issueLoginCode).not.toHaveBeenCalled()
  })

  it('never keys rate limits on the raw IP', async () => {
    await requestWhatsAppLoginCode({ phone: '0501234567', ip: IP })
    const keys = mocks.rateLimit.mock.calls.map(([opts]) => (opts as { key: string }).key)
    expect(keys.join(' ')).not.toContain(IP)
  })

  it('reports a failed send', async () => {
    mocks.sendWhatsAppAuthCode.mockRejectedValue(new Error('Meta said no'))
    const result = await requestWhatsAppLoginCode({ phone: '0501234567', ip: IP })
    expect(result).toEqual({ ok: false, error: 'sendFailed' })
  })
})

describe('verifyWhatsAppLoginCode', () => {
  const existingUser = { _id: 'user-1', verifiedPhone: '972501234567' }
  const newUser = { _id: 'user-2', verifiedPhone: '972501234567' }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimit.mockResolvedValue({ allowed: true })
    mocks.checkLoginCode.mockResolvedValue('ok')
    mocks.findUserByVerifiedPhone.mockResolvedValue(null)
    mocks.createWhatsAppUser.mockResolvedValue({ user: newUser, created: true })
  })

  it('logs into the account that owns the number', async () => {
    mocks.findUserByVerifiedPhone.mockResolvedValue(existingUser)
    const result = await verifyWhatsAppLoginCode({ phone: '0501234567', code: '123456', ip: IP })
    expect(result).toEqual({ ok: true, user: existingUser, isNewUser: false })
    expect(mocks.createWhatsAppUser).not.toHaveBeenCalled()
  })

  it('creates an account on first login, passing attribution through', async () => {
    const attribution = {
      signupSource: 'direct' as const,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
    }
    const result = await verifyWhatsAppLoginCode({
      phone: '0501234567',
      code: '123456',
      ip: IP,
      attribution,
    })
    expect(result).toEqual({ ok: true, user: newUser, isNewUser: true })
    expect(mocks.createWhatsAppUser).toHaveBeenCalledWith('972501234567', attribution)
  })

  it('does not look up or create a user when the code is wrong', async () => {
    mocks.checkLoginCode.mockResolvedValue('invalid')
    const result = await verifyWhatsAppLoginCode({ phone: '0501234567', code: '000000', ip: IP })
    expect(result).toEqual({ ok: false, error: 'invalidCode' })
    expect(mocks.findUserByVerifiedPhone).not.toHaveBeenCalled()
    expect(mocks.createWhatsAppUser).not.toHaveBeenCalled()
  })

  it('reports expired codes', async () => {
    mocks.checkLoginCode.mockResolvedValue('expired')
    const result = await verifyWhatsAppLoginCode({ phone: '0501234567', code: '123456', ip: IP })
    expect(result).toEqual({ ok: false, error: 'expiredCode' })
  })

  it('rejects malformed codes before touching storage', async () => {
    const result = await verifyWhatsAppLoginCode({ phone: '0501234567', code: '12ab', ip: IP })
    expect(result).toEqual({ ok: false, error: 'invalidCode' })
    expect(mocks.checkLoginCode).not.toHaveBeenCalled()
  })

  it('is rate limited per IP', async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false })
    const result = await verifyWhatsAppLoginCode({ phone: '0501234567', code: '123456', ip: IP })
    expect(result).toEqual({ ok: false, error: 'rateLimited' })
    expect(mocks.checkLoginCode).not.toHaveBeenCalled()
  })

  it('reports a new user as existing when a parallel login created it first', async () => {
    mocks.createWhatsAppUser.mockResolvedValue({ user: newUser, created: false })
    const result = await verifyWhatsAppLoginCode({ phone: '0501234567', code: '123456', ip: IP })
    expect(result).toEqual({ ok: true, user: newUser, isNewUser: false })
  })
})

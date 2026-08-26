import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  checkTokenLimit: vi.fn(),
  rateLimit: vi.fn(),
  checkAndIncrementChatQuota: vi.fn(),
}))

vi.mock('@/server/services/llm-usage', () => ({ checkTokenLimit: mocks.checkTokenLimit }))
vi.mock('@/infra/security/rate-limit', () => ({ rateLimit: mocks.rateLimit }))
vi.mock('@/server/services/chat-quota', () => ({
  checkAndIncrementChatQuota: mocks.checkAndIncrementChatQuota,
}))

import { enforceTutorTurnPolicy } from '@/server/services/tutor-chat/turn-policy'

const input = {
  ownerId: 'user-1',
  rateKey: 'chat:user-1',
  rateLimit: 20,
  rateWindowMs: 60_000,
}

describe('enforceTutorTurnPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkTokenLimit.mockResolvedValue({
      withinLimit: true,
      used: 0,
      limit: 100,
      resetAt: null,
    })
    mocks.rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 19,
      resetAt: Date.now() + 60_000,
      limit: 20,
    })
    mocks.checkAndIncrementChatQuota.mockResolvedValue({
      allowed: true,
      questionsUsed: 1,
      maxQuestions: 15,
      resetAt: null,
    })
  })

  it('checks token and rate limits before consuming question quota', async () => {
    await enforceTutorTurnPolicy(input)

    expect(mocks.checkTokenLimit).toHaveBeenCalledWith('user-1')
    expect(mocks.rateLimit).toHaveBeenCalledOnce()
    expect(mocks.checkAndIncrementChatQuota).toHaveBeenCalledWith('user-1')
  })

  it('does not consume question quota when the token cap rejects the turn', async () => {
    mocks.checkTokenLimit.mockResolvedValue({
      withinLimit: false,
      used: 100,
      limit: 100,
      resetAt: null,
    })

    await expect(enforceTutorTurnPolicy(input)).rejects.toMatchObject({
      code: 'token_limit_exceeded',
    })
    expect(mocks.rateLimit).not.toHaveBeenCalled()
    expect(mocks.checkAndIncrementChatQuota).not.toHaveBeenCalled()
  })

  it('returns stable quota details when the question quota rejects the turn', async () => {
    mocks.checkAndIncrementChatQuota.mockResolvedValue({
      allowed: false,
      questionsUsed: 15,
      maxQuestions: 15,
      resetAt: '2026-08-24T00:00:00.000Z',
    })

    await expect(enforceTutorTurnPolicy(input)).rejects.toMatchObject({
      code: 'quota_exceeded',
      details: { questionsUsed: 15, maxQuestions: 15 },
    })
  })
})

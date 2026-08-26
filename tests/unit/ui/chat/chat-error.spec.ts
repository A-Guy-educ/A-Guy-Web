import { describe, expect, it } from 'vitest'

import { parseChatHttpError } from '@/infra/llm/tutor-chat-error'

describe('parseChatHttpError', () => {
  it.each([
    ['quota_exceeded', 'quota'],
    ['token_limit_exceeded', 'quota'],
    ['rate_limited', 'limit'],
    ['auth_required', 'auth'],
    ['conversation_busy', 'general'],
  ] as const)('maps %s to the visible %s surface', (error, type) => {
    expect(parseChatHttpError(429, { error, message: 'message' })).toMatchObject({
      code: error,
      type,
      message: 'message',
    })
  })

  it('maps legacy quota responses without relying on quotaExceeded', () => {
    expect(parseChatHttpError(429, { error: 'Quota exceeded' })).toMatchObject({
      code: 'quota_exceeded',
      type: 'quota',
    })
  })
})

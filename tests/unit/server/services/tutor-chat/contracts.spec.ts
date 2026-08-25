import { describe, expect, it } from 'vitest'

import { chatError, isChatErrorCode, type ChatErrorCode } from '@/infra/types/tutor-chat'

describe('tutor chat contracts', () => {
  it.each<[ChatErrorCode, number]>([
    ['auth_required', 401],
    ['quota_exceeded', 429],
    ['rate_limited', 429],
    ['token_limit_exceeded', 429],
    ['conversation_busy', 409],
    ['provider_error', 502],
    ['invalid_request', 400],
  ])('maps %s to a stable HTTP response', (code, status) => {
    const result = chatError(code, { message: 'Visible message', retryAfter: 12 })

    expect(result.status).toBe(status)
    expect(result.body).toMatchObject({
      success: false,
      error: code,
      message: 'Visible message',
      retryAfter: 12,
    })
  })

  it('rejects unknown error codes', () => {
    expect(isChatErrorCode('quota_exceeded')).toBe(true)
    expect(isChatErrorCode('something_else')).toBe(false)
  })
})

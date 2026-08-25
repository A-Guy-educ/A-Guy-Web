import { isChatErrorCode, type ChatErrorCode } from '@/infra/types/tutor-chat'

export type VisibleChatError = {
  code: ChatErrorCode
  type: 'auth' | 'limit' | 'quota' | 'general'
  message: string
  retryAfter?: number
}

type ErrorPayload = {
  error?: unknown
  message?: unknown
  retryAfter?: unknown
}

function normalizeCode(status: number, value: unknown): ChatErrorCode {
  if (isChatErrorCode(value)) return value
  if (status === 401) return 'auth_required'
  if (status === 429 && String(value).toLowerCase().includes('quota')) return 'quota_exceeded'
  if (status === 429) return 'rate_limited'
  return status >= 500 ? 'provider_error' : 'invalid_request'
}

export function parseChatHttpError(status: number, payload: ErrorPayload): VisibleChatError {
  const code = normalizeCode(status, payload.error)
  const type: VisibleChatError['type'] =
    code === 'auth_required'
      ? 'auth'
      : code === 'quota_exceeded' || code === 'token_limit_exceeded'
        ? 'quota'
        : code === 'rate_limited'
          ? 'limit'
          : 'general'

  return {
    code,
    type,
    message:
      typeof payload.message === 'string'
        ? payload.message
        : typeof payload.error === 'string' && !isChatErrorCode(payload.error)
          ? payload.error
          : 'Chat failed. Try again.',
    ...(typeof payload.retryAfter === 'number' ? { retryAfter: payload.retryAfter } : {}),
  }
}

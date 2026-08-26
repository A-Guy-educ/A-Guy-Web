export const CHAT_ERROR_CODES = [
  'auth_required',
  'quota_exceeded',
  'rate_limited',
  'token_limit_exceeded',
  'conversation_busy',
  'provider_error',
  'invalid_request',
  'internal_error',
] as const

export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number]

export type ChatErrorBody = {
  success: false
  error: ChatErrorCode
  message: string
  retryAfter?: number
  questionsUsed?: number
  maxQuestions?: number
  resetAt?: string | null
  used?: number
  limit?: number | null
  traceId?: string
}

const CHAT_ERROR_STATUS: Record<ChatErrorCode, number> = {
  auth_required: 401,
  quota_exceeded: 429,
  rate_limited: 429,
  token_limit_exceeded: 429,
  conversation_busy: 409,
  provider_error: 502,
  invalid_request: 400,
  internal_error: 500,
}

const DEFAULT_MESSAGES: Record<ChatErrorCode, string> = {
  auth_required: 'Authentication required',
  quota_exceeded: 'Chat limit reached. Try again later.',
  rate_limited: 'Too many requests. Try again shortly.',
  token_limit_exceeded: 'Chat token limit reached.',
  conversation_busy: 'Another message is still being processed.',
  provider_error: 'The tutor is temporarily unavailable.',
  invalid_request: 'Invalid request',
  internal_error: 'Chat failed',
}

export function isChatErrorCode(value: unknown): value is ChatErrorCode {
  return typeof value === 'string' && CHAT_ERROR_CODES.includes(value as ChatErrorCode)
}

export function chatError(
  code: ChatErrorCode,
  details: Omit<Partial<ChatErrorBody>, 'success' | 'error'> = {},
): { status: number; body: ChatErrorBody } {
  return {
    status: CHAT_ERROR_STATUS[code],
    body: {
      success: false,
      error: code,
      message: details.message || DEFAULT_MESSAGES[code],
      ...(details.retryAfter !== undefined ? { retryAfter: details.retryAfter } : {}),
      ...(details.questionsUsed !== undefined ? { questionsUsed: details.questionsUsed } : {}),
      ...(details.maxQuestions !== undefined ? { maxQuestions: details.maxQuestions } : {}),
      ...(details.resetAt !== undefined ? { resetAt: details.resetAt } : {}),
      ...(details.used !== undefined ? { used: details.used } : {}),
      ...(details.limit !== undefined ? { limit: details.limit } : {}),
      ...(details.traceId ? { traceId: details.traceId } : {}),
    },
  }
}

export class TutorChatError extends Error {
  constructor(
    public readonly code: ChatErrorCode,
    message?: string,
    public readonly details: Omit<Partial<ChatErrorBody>, 'success' | 'error' | 'message'> = {},
  ) {
    super(message || DEFAULT_MESSAGES[code])
    this.name = 'TutorChatError'
  }
}

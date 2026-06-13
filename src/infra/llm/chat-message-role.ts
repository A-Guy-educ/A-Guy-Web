/**
 * Chat Role Enum
 *
 * @ai-summary Gemini API uses 'model' for assistant, not 'assistant' — toGeminiRole() is the only sanctioned conversion point; using raw strings elsewhere causes silent role mismatches in multi-turn conversations.
 */

export enum ChatRole {
  User = 'user',
  Assistant = 'assistant',
}

export function isChatRole(value: unknown): value is ChatRole {
  return typeof value === 'string' && Object.values(ChatRole).includes(value as ChatRole)
}

export function parseChatRole(value: unknown): ChatRole {
  if (!isChatRole(value)) {
    throw new Error(`Invalid chat role: ${String(value)}`)
  }
  return value
}

/**
 * Convert ChatRole to Gemini API format
 * Gemini uses 'user' and 'model', we use 'user' and 'assistant'
 */
export function toGeminiRole(role: ChatRole): 'user' | 'model' {
  return role === ChatRole.Assistant ? 'model' : 'user'
}

/**
 * Convert Gemini API format to ChatRole
 */
export function fromGeminiRole(role: 'user' | 'model'): ChatRole {
  return role === 'model' ? ChatRole.Assistant : ChatRole.User
}

// =============================================================================
// Backward Compatibility
// =============================================================================
// These will be removed in a future version after full migration

/** @deprecated Use ChatRole instead */
export const ChatMessageRole = ChatRole

/** @deprecated Use isChatRole instead */
export const isChatMessageRole = isChatRole

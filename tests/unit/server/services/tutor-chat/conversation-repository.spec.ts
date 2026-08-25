import { describe, expect, it } from 'vitest'

import { buildCompactedConversation } from '@/server/services/tutor-chat/conversation-repository'

describe('buildCompactedConversation', () => {
  it('preserves the recent window and summarizes older messages', () => {
    const messages = Array.from({ length: 45 }, (_, index) => ({
      id: String(index),
      turnId: `turn-${Math.floor(index / 2)}`,
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `message-${index}`,
      timestamp: new Date(2026, 0, 1, 0, index).toISOString(),
    }))

    const result = buildCompactedConversation({ messages, summary: 'Existing summary' })

    expect(result).not.toBeNull()
    expect(result?.messages).toHaveLength(20)
    expect(result?.messages[0]?.content).toBe('message-25')
    expect(result?.summary).toContain('Existing summary')
    expect(result?.summary).toContain('message-24')
    expect(result?.summaryUntilTimestamp).toBe(messages[24]?.timestamp)
  })

  it('does nothing below the maintenance threshold', () => {
    expect(buildCompactedConversation({ messages: [], summary: '' })).toBeNull()
  })
})

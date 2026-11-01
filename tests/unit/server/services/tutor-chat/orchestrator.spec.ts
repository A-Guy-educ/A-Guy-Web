import { describe, expect, it, vi } from 'vitest'

import type {
  TutorConversation,
  TutorConversationRepository,
  TutorStoredMessage,
} from '@/server/services/tutor-chat/conversation-repository'
import type { TutorModelGateway } from '@/server/services/tutor-chat/model-gateway'
import { TutorChatOrchestrator } from '@/server/services/tutor-chat/orchestrator'

function createRepository() {
  const conversation: TutorConversation = {
    id: 'conversation-1',
    user: 'user-1',
    contextKey: 'lessons:lesson-1',
    messages: [],
  }
  const appended: TutorStoredMessage[] = []
  const repository: TutorConversationRepository = {
    getOrCreate: vi.fn(async () => conversation),
    claimTurn: vi.fn(async () => true),
    releaseTurn: vi.fn(async () => undefined),
    discardTurn: vi.fn(async (_ownerId, _conversationId, turnId) => {
      conversation.messages = conversation.messages.filter((message) => message.turnId !== turnId)
    }),
    appendMessage: vi.fn(async (_ownerId, _conversationId, message) => {
      const stored = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...message }
      appended.push(stored)
      conversation.messages.push(stored)
      return stored
    }),
    compact: vi.fn(async () => false),
  }
  return { repository, conversation, appended }
}

describe('TutorChatOrchestrator', () => {
  it('owns a complete idempotent tutor turn', async () => {
    const { repository, appended } = createRepository()
    const gateway: TutorModelGateway = {
      generate: vi.fn(async () => ({
        text: 'Tutor answer',
        inputTokens: 4,
        outputTokens: 2,
        model: 'test-model',
      })),
      stream: vi.fn(),
    }
    const orchestrator = new TutorChatOrchestrator({ repository, gateway })

    const beforeGenerate = vi.fn(async () => undefined)
    const result = await orchestrator.run({
      ownerId: 'user-1',
      contextKey: 'lessons:lesson-1',
      turnId: '3a50ab3a-b5cf-45d2-a09d-bf22791902a8',
      message: 'Help me',
      acknowledgment: 'Sure',
      lessonText: 'Lesson context',
      attachmentText: '',
      parts: [],
      beforeGenerate,
    })

    expect(result.message).toBe('Tutor answer')
    expect(appended.map((message) => message.role)).toEqual(['user', 'assistant'])
    expect(repository.claimTurn).toHaveBeenCalledOnce()
    expect(repository.releaseTurn).toHaveBeenCalledOnce()
    expect(repository.compact).toHaveBeenCalledOnce()
    expect(beforeGenerate).toHaveBeenCalledOnce()
  })

  it('returns a completed turn without calling the model again', async () => {
    const { repository, conversation } = createRepository()
    conversation.messages.push({
      id: 'assistant-1',
      turnId: '3a50ab3a-b5cf-45d2-a09d-bf22791902a8',
      role: 'assistant',
      content: 'Cached answer',
      timestamp: new Date().toISOString(),
    })
    const gateway: TutorModelGateway = {
      generate: vi.fn(),
      stream: vi.fn(),
    }
    const orchestrator = new TutorChatOrchestrator({ repository, gateway })

    const beforeGenerate = vi.fn(async () => undefined)
    const result = await orchestrator.run({
      ownerId: 'user-1',
      contextKey: 'lessons:lesson-1',
      turnId: '3a50ab3a-b5cf-45d2-a09d-bf22791902a8',
      message: 'Help me',
      acknowledgment: 'Sure',
      attachmentText: '',
      parts: [],
      beforeGenerate,
    })

    expect(result.message).toBe('Cached answer')
    expect(result.cached).toBe(true)
    expect(gateway.generate).not.toHaveBeenCalled()
    expect(beforeGenerate).not.toHaveBeenCalled()
  })

  it('releases the turn when pre-generation policy rejects it', async () => {
    const { repository, appended } = createRepository()
    const gateway: TutorModelGateway = { generate: vi.fn(), stream: vi.fn() }
    const orchestrator = new TutorChatOrchestrator({ repository, gateway })

    await expect(
      orchestrator.run({
        ownerId: 'user-1',
        contextKey: 'lessons:lesson-1',
        turnId: '3a50ab3a-b5cf-45d2-a09d-bf22791902a8',
        message: 'Help me',
        acknowledgment: 'Sure',
        attachmentText: '',
        parts: [],
        beforeGenerate: async () => {
          throw new Error('quota rejected')
        },
      }),
    ).rejects.toThrow('quota rejected')

    expect(appended).toHaveLength(0)
    expect(repository.releaseTurn).toHaveBeenCalledOnce()
    expect(gateway.generate).not.toHaveBeenCalled()
  })

  it('discards the incomplete turn and releases its lock when the provider fails', async () => {
    const { repository, conversation } = createRepository()
    const gateway: TutorModelGateway = {
      generate: vi.fn(async () => {
        throw new Error('provider failed')
      }),
      stream: vi.fn(),
    }
    const orchestrator = new TutorChatOrchestrator({ repository, gateway })

    await expect(
      orchestrator.run({
        ownerId: 'user-1',
        contextKey: 'lessons:lesson-1',
        turnId: '3a50ab3a-b5cf-45d2-a09d-bf22791902a8',
        message: 'Help me',
        acknowledgment: 'Sure',
        attachmentText: '',
        parts: [],
      }),
    ).rejects.toThrow('provider failed')

    expect(repository.discardTurn).toHaveBeenCalledWith(
      'user-1',
      'conversation-1',
      '3a50ab3a-b5cf-45d2-a09d-bf22791902a8',
    )
    expect(conversation.messages).toHaveLength(0)
    expect(repository.releaseTurn).toHaveBeenCalledOnce()
  })
})

import { buildTutorContext } from './context-builder'
import { TutorChatError } from '@/infra/types/tutor-chat'
import type {
  TutorConversation,
  TutorConversationRepository,
  TutorStoredMessage,
} from './conversation-repository'
import type { TutorModelGateway, TutorModelPart, TutorModelUsage } from './model-gateway'

export type TutorTurnInput = {
  ownerId: string
  contextKey: string
  turnId: string
  message: string
  acknowledgment: string
  lessonText?: string
  systemInstructions?: string
  attachmentText: string
  parts: TutorModelPart[]
  hidden?: boolean
  hidePromptOnly?: boolean
  media?: Array<{ mediaId: string }>
  chatAssets?: Array<{ chatAssetId: string }>
  signal?: AbortSignal
  beforeGenerate?: () => Promise<void>
}

export type TutorTurnResult = TutorModelUsage & {
  message: string
  conversationId: string
  contextKey: string
  cached?: boolean
}

function completedTurn(conversation: TutorConversation, turnId: string): TutorStoredMessage | null {
  return (
    conversation.messages.find(
      (message) => message.turnId === turnId && message.role === 'assistant',
    ) || null
  )
}

export class TutorChatOrchestrator {
  constructor(
    private readonly dependencies: {
      repository: TutorConversationRepository
      gateway: TutorModelGateway
    },
  ) {}

  private async prepare(input: TutorTurnInput) {
    const conversation = await this.dependencies.repository.getOrCreate(
      input.ownerId,
      input.contextKey,
    )
    const completed = completedTurn(conversation, input.turnId)
    if (completed) return { conversation, completed }

    const claimed = await this.dependencies.repository.claimTurn(
      input.ownerId,
      conversation.id,
      input.turnId,
    )
    if (!claimed) throw new TutorChatError('conversation_busy')

    try {
      await input.beforeGenerate?.()
      await this.dependencies.repository.appendMessage(input.ownerId, conversation.id, {
        turnId: input.turnId,
        role: 'user',
        content: input.message,
        hidden: input.hidden,
        media: input.media,
        chatAssets: input.chatAssets,
      })

      const context = buildTutorContext({
        message: input.message,
        history: conversation.messages,
        summary: conversation.summary,
        lessonText: input.lessonText,
        attachmentText: input.attachmentText,
        systemInstructions: input.systemInstructions,
      })
      return { conversation, completed: null, context }
    } catch (error) {
      await this.dependencies.repository.releaseTurn(input.ownerId, conversation.id, input.turnId)
      throw error
    }
  }

  private cachedResult(input: TutorTurnInput, conversation: TutorConversation, message: string) {
    return {
      message,
      conversationId: conversation.id,
      contextKey: input.contextKey,
      inputTokens: 0,
      outputTokens: 0,
      model: 'cached',
      cached: true,
    } satisfies TutorTurnResult
  }

  async run(input: TutorTurnInput): Promise<TutorTurnResult> {
    const prepared = await this.prepare(input)
    if (prepared.completed) {
      return this.cachedResult(input, prepared.conversation, prepared.completed.content)
    }

    let completed = false
    try {
      const result = await this.dependencies.gateway.generate({
        system: prepared.context.system,
        prompt: prepared.context.prompt,
        parts: input.parts,
        signal: input.signal,
      })
      const message = result.text.trim() || input.acknowledgment
      await this.dependencies.repository.appendMessage(input.ownerId, prepared.conversation.id, {
        turnId: input.turnId,
        role: 'assistant',
        content: message,
        hidden: Boolean(input.hidden && !input.hidePromptOnly),
      })
      completed = true
      await this.dependencies.repository.compact(input.ownerId, prepared.conversation.id)
      return {
        ...result,
        message,
        conversationId: prepared.conversation.id,
        contextKey: input.contextKey,
      }
    } catch (error) {
      if (!completed) {
        await this.dependencies.repository.discardTurn(
          input.ownerId,
          prepared.conversation.id,
          input.turnId,
        )
      }
      throw error
    } finally {
      await this.dependencies.repository.releaseTurn(
        input.ownerId,
        prepared.conversation.id,
        input.turnId,
      )
    }
  }

  async *stream(input: TutorTurnInput): AsyncGenerator<string, TutorTurnResult> {
    const prepared = await this.prepare(input)
    if (prepared.completed) {
      yield prepared.completed.content
      return this.cachedResult(input, prepared.conversation, prepared.completed.content)
    }

    let message = ''
    let completed = false
    try {
      const providerStream = this.dependencies.gateway.stream({
        system: prepared.context.system,
        prompt: prepared.context.prompt,
        parts: input.parts,
        signal: input.signal,
      })
      let usage: TutorModelUsage | undefined
      while (true) {
        const next = await providerStream.next()
        if (next.done) {
          usage = next.value
          break
        }
        message += next.value
        yield next.value
      }
      const finalMessage = message.trim() || input.acknowledgment
      if (!message.trim() && finalMessage) yield finalMessage
      await this.dependencies.repository.appendMessage(input.ownerId, prepared.conversation.id, {
        turnId: input.turnId,
        role: 'assistant',
        content: finalMessage,
        hidden: Boolean(input.hidden && !input.hidePromptOnly),
      })
      completed = true
      await this.dependencies.repository.compact(input.ownerId, prepared.conversation.id)
      return {
        ...(usage || { inputTokens: 0, outputTokens: 0, model: 'unknown' }),
        message: finalMessage,
        conversationId: prepared.conversation.id,
        contextKey: input.contextKey,
      }
    } catch (error) {
      if (!completed) {
        await this.dependencies.repository.discardTurn(
          input.ownerId,
          prepared.conversation.id,
          input.turnId,
        )
      }
      throw error
    } finally {
      await this.dependencies.repository.releaseTurn(
        input.ownerId,
        prepared.conversation.id,
        input.turnId,
      )
    }
  }
}

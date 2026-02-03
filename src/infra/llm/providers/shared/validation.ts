/**
 * Input Validation for LLM Providers
 */
import { getChatConfig } from './chat-config'
import { LLMError, LLMErrorCode } from './errors'

export interface GenerateChatInput {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  model: { temperature?: number; maxOutputTokens?: number }
}

export interface GenerateMultimodalInput {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  mediaParts: Array<{
    mediaId: string
    absoluteFilePath: string
    publicUrl: string
    mimeType: string
  }>
  model: { temperature?: number; maxOutputTokens?: number }
}

export async function validateChatInput(input: GenerateChatInput, provider: string): Promise<void> {
  if (!input.messages || !Array.isArray(input.messages) || input.messages.length === 0) {
    throw new LLMError('Messages array is required', LLMErrorCode.VALIDATION_ERROR, provider, false)
  }

  for (let i = 0; i < input.messages.length; i++) {
    const msg = input.messages[i]
    if (!msg?.role || !['user', 'assistant', 'system'].includes(msg.role)) {
      throw new LLMError(
        `Invalid role at index ${i}`,
        LLMErrorCode.VALIDATION_ERROR,
        provider,
        false,
      )
    }
    if (typeof msg.content !== 'string') {
      throw new LLMError(
        `Invalid content at index ${i}`,
        LLMErrorCode.VALIDATION_ERROR,
        provider,
        false,
      )
    }
  }

  const config = await getChatConfig()
  if (input.model?.temperature !== undefined) {
    if (
      input.model.temperature < config.temperature.min ||
      input.model.temperature > config.temperature.max
    ) {
      throw new LLMError(
        `Temperature must be between ${config.temperature.min} and ${config.temperature.max}`,
        LLMErrorCode.VALIDATION_ERROR,
        provider,
        false,
      )
    }
  }

  if (input.model?.maxOutputTokens !== undefined) {
    if (input.model.maxOutputTokens <= 0 || input.model.maxOutputTokens > config.tokens.maxMax) {
      throw new LLMError(
        `maxOutputTokens must be between 1 and ${config.tokens.maxMax}`,
        LLMErrorCode.VALIDATION_ERROR,
        provider,
        false,
      )
    }
  }
}

export async function validateMultimodalInput(
  input: GenerateMultimodalInput,
  provider: string,
): Promise<void> {
  await validateChatInput({ messages: input.messages, model: input.model }, provider)

  if (!input.mediaParts || !Array.isArray(input.mediaParts)) {
    throw new LLMError(
      'Media parts array is required',
      LLMErrorCode.VALIDATION_ERROR,
      provider,
      false,
    )
  }

  const config = await getChatConfig()
  if (input.mediaParts.length > config.multipart.maxImages) {
    throw new LLMError(
      `Cannot process more than ${config.multipart.maxImages} media parts`,
      LLMErrorCode.VALIDATION_ERROR,
      provider,
      false,
    )
  }

  for (let i = 0; i < input.mediaParts.length; i++) {
    const part = input.mediaParts[i]
    if (!part?.mediaId || !part?.absoluteFilePath || !part?.mimeType) {
      throw new LLMError(
        `Missing required fields at media part index ${i}`,
        LLMErrorCode.VALIDATION_ERROR,
        provider,
        false,
      )
    }

    const isValid =
      config.multipart.supportedImages.includes(part.mimeType) ||
      config.multipart.supportedPdfs.includes(part.mimeType)

    if (!isValid) {
      throw new LLMError(
        `Unsupported mime type "${part.mimeType}"`,
        LLMErrorCode.VALIDATION_ERROR,
        provider,
        false,
      )
    }
  }
}

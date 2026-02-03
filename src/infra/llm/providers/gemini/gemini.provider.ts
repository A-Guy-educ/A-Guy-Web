/**
 * Gemini Provider - Public API
 * Single entry point for all Gemini AI operations
 *
 * @public This is the ONLY file consumers should import from
 */
import type { AIModel } from '@/infra/llm/models'
import {
  createErrorClassifier,
  LLMError,
  LLMErrorCode,
  withRetry,
} from '@/infra/llm/providers/shared'
import { getChatConfig } from '@/infra/llm/providers/shared/chat-config'
import { logger } from '@/infra/utils/logger'
import type { Payload } from 'payload'
import { getGeminiClient } from './gemini.client'
import { extractResponseText, mapMessagesToGeminiHistory } from './gemini.mapper'

// Provider identification for logging
const PROVIDER_NAME = 'gemini'
const PROVIDER_VERSION = '1.0'

// ─────────────────────────────────────────────────────────────────────────────
// Public Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// AIModel is imported from centralized models.ts (re-exported for convenience)
export type { AIModel } from '@/infra/llm/models'

export interface GenerateChatInput {
  system: string
  messages: ChatMessage[]
  model: AIModel
  acknowledgment: string
  timeoutMs?: number
}

export interface GenerateChatOutput {
  text: string
  raw?: unknown
}

export interface GenerateMultimodalInput {
  prompt: string
  model: AIModel
  attachments: Array<{
    data: string // base64 encoded
    mimeType: string // e.g., 'application/pdf'
  }>
  timeoutMs?: number
}

// Re-export from shared module for backwards compatibility
export { LLMError as GeminiError, LLMErrorCode as GeminiErrorCode }

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Error classifier for Gemini
const { isRetryable, wrapError: wrapGeminiError } = createErrorClassifier('gemini')

// ─────────────────────────────────────────────────────────────────────────────
// Main API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a chat completion using Gemini
 */
export async function generateChatCompletion(
  input: GenerateChatInput,
  payload: Payload,
): Promise<GenerateChatOutput> {
  const config = getChatConfig()
  const timeoutMs = input.timeoutMs ?? config.chatSettings.defaultChatTimeoutMs

  return withRetry<GenerateChatOutput, Error>(() => executeWithTimeout(input, timeoutMs, payload), {
    maxRetries: config.chatSettings.defaultMaxRetries,
    delayMs: config.chatSettings.defaultRetryDelayMs,
    isRetryable,
    wrapError: (e: Error) => wrapGeminiError(e),
    logPrefix: '[GeminiProvider]',
    onRetry: (error: Error, attempt: number) => {
      logger.warn({ err: error, attempt, retrying: true }, '[GeminiProvider] Retrying after error')
    },
  })
}

/**
 * Generate a multimodal completion using Gemini
 */
export async function generateMultimodalCompletion(
  input: GenerateMultimodalInput,
  payload: Payload,
): Promise<GenerateChatOutput> {
  const config = getChatConfig()
  const timeoutMs = input.timeoutMs ?? config.chatSettings.defaultChatTimeoutMs

  return withRetry<GenerateChatOutput, Error>(
    () => executeMultimodalWithTimeout(input, timeoutMs, payload),
    {
      maxRetries: config.chatSettings.defaultMaxRetries,
      delayMs: config.chatSettings.defaultRetryDelayMs,
      isRetryable,
      wrapError: (e: Error) => wrapGeminiError(e),
      logPrefix: '[GeminiProvider]',
      onRetry: (error: Error, attempt: number) => {
        logger.warn(
          { err: error, attempt, retrying: true },
          '[GeminiProvider] Retrying after error',
        )
      },
    },
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Implementation
// ─────────────────────────────────────────────────────────────────────────────

async function executeWithTimeout(
  input: GenerateChatInput,
  timeoutMs: number,
  payload: Payload,
): Promise<GenerateChatOutput> {
  const client = await getGeminiClient(payload)

  const model = client.getGenerativeModel({
    model: input.model.name,
    generationConfig: {
      temperature: input.model.temperature,
      maxOutputTokens: input.model.maxOutputTokens,
    },
  })

  // Build messages array with system message first
  const allMessages: ChatMessage[] = [{ role: 'system', content: input.system }, ...input.messages]

  // Get the current user message (last user message in the array)
  const userMessages = input.messages.filter((m) => m.role === 'user')
  const currentMessage =
    userMessages.length > 0 ? userMessages[userMessages.length - 1].content : ''

  // Map to Gemini format
  const { history, currentMessage: finalMessage } = mapMessagesToGeminiHistory(
    allMessages,
    currentMessage,
    input.acknowledgment,
  )

  // Log provider details for the request
  logger.info(
    {
      provider: PROVIDER_NAME,
      providerVersion: PROVIDER_VERSION,
      model: input.model.name,
      temperature: input.model.temperature,
      maxOutputTokens: input.model.maxOutputTokens,
      capabilities: input.model.capabilities ?? [],
      historyLength: history.length,
      messageCount: input.messages.length,
      timeoutMs,
      currentMessagePreview: finalMessage.substring(0, 100),
    },
    '[GeminiProvider] Chat completion request',
  )

  const startTime = Date.now()

  // Create timeout promise
  const timeoutError = new Error(`Model call timed out after ${timeoutMs}ms`)
  timeoutError.name = 'TimeoutError'
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(timeoutError), timeoutMs)
  })

  // Execute chat with timeout
  const chat = model.startChat({ history })
  const result = await Promise.race([chat.sendMessage(finalMessage), timeoutPromise])

  const processingTimeMs = Date.now() - startTime
  const text = extractResponseText(result.response)

  // Log successful completion
  logger.info(
    {
      provider: PROVIDER_NAME,
      providerVersion: PROVIDER_VERSION,
      model: input.model.name,
      processingTimeMs,
      responseLength: text.length,
    },
    '[GeminiProvider] Chat completion completed',
  )

  return {
    text,
    raw: result,
  }
}

async function executeMultimodalWithTimeout(
  input: GenerateMultimodalInput,
  timeoutMs: number,
  payload: Payload,
): Promise<GenerateChatOutput> {
  const client = await getGeminiClient(payload)

  const model = client.getGenerativeModel({
    model: input.model.name,
    generationConfig: {
      temperature: input.model.temperature,
      maxOutputTokens: input.model.maxOutputTokens,
    },
  })

  // Log provider details for multimodal request
  logger.info(
    {
      provider: PROVIDER_NAME,
      providerVersion: PROVIDER_VERSION,
      model: input.model.name,
      temperature: input.model.temperature,
      maxOutputTokens: input.model.maxOutputTokens,
      capabilities: input.model.capabilities ?? [],
      promptLength: input.prompt.length,
      attachmentCount: input.attachments.length,
      mimeTypes: input.attachments.map((a) => a.mimeType),
      timeoutMs,
    },
    '[GeminiProvider] Multimodal completion request',
  )

  const startTime = Date.now()

  // Build parts array: text prompt + inline data attachments
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: input.prompt },
  ]

  for (const attachment of input.attachments) {
    parts.push({
      inlineData: {
        data: attachment.data,
        mimeType: attachment.mimeType,
      },
    })
  }

  // Create timeout promise
  const timeoutError = new Error(`Model call timed out after ${timeoutMs}ms`)
  timeoutError.name = 'TimeoutError'
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(timeoutError), timeoutMs)
  })

  // Execute multimodal request with timeout
  const result = await Promise.race([
    model.generateContent({ contents: [{ role: 'user', parts }] }),
    timeoutPromise,
  ])

  const processingTimeMs = Date.now() - startTime
  const text = extractResponseText(result.response)

  // Log successful completion
  logger.info(
    {
      provider: PROVIDER_NAME,
      providerVersion: PROVIDER_VERSION,
      model: input.model.name,
      processingTimeMs,
      responseLength: text.length,
    },
    '[GeminiProvider] Multimodal completion completed',
  )

  return {
    text,
    raw: result,
  }
}

export { isGeminiApiKeyConfigured } from './gemini.client'

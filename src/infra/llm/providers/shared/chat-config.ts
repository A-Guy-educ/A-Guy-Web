/**
 * Chat Config
 * Loads configuration from ConfigValues (chat domain)
 */
import { ConfigDomain } from '@/infra/config/config-constants'
import { getConfigDomain } from '@/infra/config/runtime'

export interface ChatConfig {
  timeouts: { defaultMs: number; toolCallMs: number; streamingMs: number }
  retry: { maxRetries: number; delayMs: number; exponentialBase: number; jitterFactor: number }
  tokens: { defaultMax: number; maxMax: number }
  temperature: { min: number; max: number; default: number }
  multipart: {
    maxImages: number
    maxSizeMb: number
    supportedImages: string[]
    supportedPdfs: string[]
  }
  providerUrls: { geminiApiBase: string; openaiCompatibleApiBase: string }
  defaultModels: { gemini: string; openaiCompatible: string }
  chatSettings: {
    maxToolIterations: number
    defaultMaxRetries: number
    defaultRetryDelayMs: number
    defaultChatTimeoutMs: number
    defaultToolTimeoutMs: number
  }
}

export async function getChatConfig(): Promise<ChatConfig> {
  return (await getConfigDomain(ConfigDomain.Chat)) as unknown as ChatConfig
}

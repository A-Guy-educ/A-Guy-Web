/**
 * LLM Provider Types
 *
 * @ai-summary Two-variant enum (Gemini / OpenAI-compatible). Adding a third
 * provider requires updating this file, the error adapter, the instance manager,
 * and every place that does string-switching on provider type — search carefully.
 * Only two providers: GEMINI and OPENAI_COMPATIBLE. The string values match the
 * LLM_PROVIDER env var — do not change them without updating the env var convention.
 *
 * @fileType types
 * @domain ai
 * @pattern enum
 */

// Provider types - matches LLM_PROVIDER env var values
export const LLMProviderType = {
  GEMINI: 'gemini',
  OPENAI_COMPATIBLE: 'openai-compatible',
} as const

export type LLMProviderType = (typeof LLMProviderType)[keyof typeof LLMProviderType]

/**
 * AI Service Layer — entry point for all AI functionality in the infra layer.
 *
 * @ai-summary Centralized facade over Genkit adapters and a provider factory.
 * Hides which LLM is actually running (Gemini, OpenAI-compatible, etc.) behind
 * a unified interface. All AI services in `src/infra/llm/services/` depend on
 * this API rather than calling Genkit or the provider directly.
 *
 * @fileType ai-utility
 * @domain chat
 * @pattern facade
 *
 * ## Entry points
 * - `createGenkitUnifiedAdapter()` — builds the Genkit-backed provider used by most services
 * - `getLLMProvider()` / `detectBestProvider()` — runtime provider selection via factory
 *
 * ## Load-bearing gotchas
 * - Provider detection is **per-request**, not at startup; warm lambda instances
 *   may have a different "best" provider if env vars changed since boot
 * - The error classifier (`createErrorClassifier`) maps provider-specific errors
 *   to `LLMErrorCode` — missing a new error shape in one provider means it
 *   bleeds through as a generic `UNKNOWN` error until the mapping is extended
 */

// Genkit-based provider exports
export { createGenkitUnifiedAdapter, isGenkitConfigured } from './genkit'

// Provider factory for runtime provider switching
export {
  checkProviderAvailability,
  detectBestProvider,
  getLLMProvider,
  getProviderModelConfig,
  LLMProviderType,
  type LLMProviderConfig,
  type UnifiedLLMProvider,
} from './providers/factory'

// Shared error handling
export { createErrorClassifier, LLMError, LLMErrorCode } from './providers/shared/errors'

// Model config - centralized from models.ts
export {
  AI_MODELS,
  getModelNameOverride,
  getModelRegistryEntry,
  getModelsWithCapability,
  getProviderModelName,
  isModelOverrideConfigured,
  MODEL_REGISTRY,
  modelSupportsCapability,
  PROVIDER_MODEL_NAMES,
  type AIModel,
  type AIModelConfig,
  type AIModelKey,
} from './models'

// Image services
export {
  extractFromImage,
  type ImageToExerciseInput,
  type ImageToExerciseResponse,
  type ImageToExerciseResult,
} from './services/data-extractor-service'
export { optimizeImageForAI, type OptimizedImage } from './services/image-optimizer-service'

// Chat service (uses provider internally)
export {
  chatWithExerciseHelper,
  type ChatMessage,
  type ExerciseChatInput,
  type ExerciseChatResult,
} from './services/exercise-chat-service'

// Prompts
export { SIMPLE_TEXT_QUESTION_PROMPT } from './prompts/simple-text-question'

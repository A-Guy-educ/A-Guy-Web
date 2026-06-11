/**
 * AI Service Layer - Public API
 *
 * @ai-summary Centralizes all AI functionality (LLM chat, embeddings, vector search, lesson generation). Exists so callers import from one place — new sub-modules must add their exports here to be accessible.
 *
 * @fileType index
 * @domain ai
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

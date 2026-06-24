/**
 * Genkit LLM Integration
 * Unified interface for Genkit-based LLM operations
 *
 * @fileType index
 * @domain ai
 * @pattern abstraction, genkit, provider-abstraction
 * @ai-summary Thin re-export barrel providing a stable public contract over unstable internal submodules
 */
import { createGenkitErrorAdapter, getErrorAdapter } from './adapters/error-adapter'
import { createGenkitUnifiedAdapter, isGenkitConfigured } from './adapters/unified-adapter'

export { createGenkitErrorAdapter, createGenkitUnifiedAdapter, getErrorAdapter, isGenkitConfigured }

/**
 * Genkit LLM Integration
 * Unified interface for Genkit-based LLM operations
 *
 * @fileType index
 * @domain ai
 * @pattern abstraction, genkit, provider-abstraction
 * @ai-summary Thin re-export barrel — stable public contract is this file's exports only. Submodule imports (adapters/, tools/) are internal and subject to breaking changes.
 */
import { createGenkitErrorAdapter, getErrorAdapter } from './adapters/error-adapter'
import { createGenkitUnifiedAdapter, isGenkitConfigured } from './adapters/unified-adapter'

export { createGenkitErrorAdapter, createGenkitUnifiedAdapter, getErrorAdapter, isGenkitConfigured }

/**
 * Genkit LLM Integration
 * Unified interface for Genkit-based LLM operations
 *
 * @ai-summary Thin re-export barrel that provides a stable public contract over the unstable genkit submodules. Consumers import from here rather than reaching into sub-modules directly, so internal restructuring does not break downstream callers.
 * @fileType index
 * @domain ai
 * @pattern abstraction, genkit, provider-abstraction
 */
import { createGenkitErrorAdapter, getErrorAdapter } from './adapters/error-adapter'
import { createGenkitUnifiedAdapter, isGenkitConfigured } from './adapters/unified-adapter'

export { createGenkitErrorAdapter, createGenkitUnifiedAdapter, getErrorAdapter, isGenkitConfigured }

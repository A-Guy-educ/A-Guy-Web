/**
 * Genkit LLM Integration
 * Unified interface for Genkit-based LLM operations
 *
 * @ai-summary Thin re-export barrel for the genkit submodule. Import from here for the stable public contract — submodule file structure is unstable and subject to change without notice.
 *
 * @fileType index
 * @domain ai
 * @pattern abstraction, genkit, provider-abstraction
 */
import { createGenkitErrorAdapter, getErrorAdapter } from './adapters/error-adapter'
import { createGenkitUnifiedAdapter, isGenkitConfigured } from './adapters/unified-adapter'

export { createGenkitErrorAdapter, createGenkitUnifiedAdapter, getErrorAdapter, isGenkitConfigured }

/**
 * Genkit LLM Integration
 * Unified interface for Genkit-based LLM operations
 *
 * @fileType index
 * @domain ai
 * @pattern abstraction, genkit, provider-abstraction
 * @ai-summary Thin re-export barrel for the genkit submodule. Submodule imports
 *             (e.g. from ./adapters/) are internal and unstable — always import from
 *             this index instead.
 */
import { createGenkitErrorAdapter, getErrorAdapter } from './adapters/error-adapter'
import { createGenkitUnifiedAdapter, isGenkitConfigured } from './adapters/unified-adapter'

export { createGenkitErrorAdapter, createGenkitUnifiedAdapter, getErrorAdapter, isGenkitConfigured }

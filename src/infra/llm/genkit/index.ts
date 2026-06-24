/**
 * Genkit LLM Integration
 * Unified interface for Genkit-based LLM operations
 *
 * @ai-summary Thin re-export barrel that stabilises the public contract over the genkit submodules (adapters, tools). All unstable internal paths are hidden behind this index — callers import from here, not from sub-modules directly.
 *
 * @fileType index
 * @domain ai
 * @pattern abstraction, genkit, provider-abstraction
 */
import { createGenkitErrorAdapter, getErrorAdapter } from './adapters/error-adapter'
import { createGenkitUnifiedAdapter, isGenkitConfigured } from './adapters/unified-adapter'

export { createGenkitErrorAdapter, createGenkitUnifiedAdapter, getErrorAdapter, isGenkitConfigured }

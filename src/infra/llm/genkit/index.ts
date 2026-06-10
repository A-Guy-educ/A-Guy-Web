/**
 * Genkit LLM Integration
 *
 * @ai-summary Thin Genkit wrapper that exposes `createGenkitUnifiedAdapter()`,
 * which is the primary entry point for AI services to get a configured LLM client.
 * Does not add significant logic — delegates to the unified adapter.
 *
 * @fileType index
 * @domain ai
 * @pattern abstraction, genkit, provider-abstraction
 */
import { createGenkitErrorAdapter, getErrorAdapter } from './adapters/error-adapter'
import { createGenkitUnifiedAdapter, isGenkitConfigured } from './adapters/unified-adapter'

export { createGenkitErrorAdapter, createGenkitUnifiedAdapter, getErrorAdapter, isGenkitConfigured }

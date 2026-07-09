/**
 * Genkit LLM integration
 *
 * @ai-summary Entry point for Genkit-based LLM operations. Exposes `createGenkitUnifiedAdapter` which is the runtime adapter — all chat/completion calls go through it.
 *
 * @fileType index
 * @domain ai
 * @pattern abstraction, genkit, provider-abstraction
 * @ai-summary Thin re-export layer — the actual implementation lives in adapters/unified-adapter.ts; this file exists to give callers a stable import path.
 */

import { createGenkitErrorAdapter, getErrorAdapter } from './adapters/error-adapter'
import { createGenkitUnifiedAdapter, isGenkitConfigured } from './adapters/unified-adapter'

export { createGenkitErrorAdapter, createGenkitUnifiedAdapter, getErrorAdapter, isGenkitConfigured }

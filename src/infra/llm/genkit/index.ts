/**
 * Genkit LLM integration
 *
 * @ai-summary Entry point for Genkit-based LLM operations. Exposes `createGenkitUnifiedAdapter` which is the runtime adapter — all chat/completion calls go through it.
 *
 * @fileType index
 * @domain ai
 * @pattern abstraction, genkit, provider-abstraction
 * @ai-summary Thin re-export barrel for Genkit-based LLM operations. Actual LLM initialization lives in genkit-instance.ts; the adapter (unified-adapter.ts) handles provider specifics. Agents should import from here, not reach into submodules — the submodule surface is unstable.
 */
import { createGenkitErrorAdapter, getErrorAdapter } from './adapters/error-adapter'
import { createGenkitUnifiedAdapter, isGenkitConfigured } from './adapters/unified-adapter'

export { createGenkitErrorAdapter, createGenkitUnifiedAdapter, getErrorAdapter, isGenkitConfigured }

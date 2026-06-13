Fix round for PR #66 (#63). Two changes to src/infra/llm/genkit/adapters/unified-adapter.ts:

1. **Bug fix**: `generateChatCompletionWithTools` was returning `toolCalls: []` (always empty), discarding Genkit's tool calls. Now extracts from `result.toolCalls` and maps `{ toolName, arguments }` → `{ name, args }` to match UnifiedLLMProvider interface.

2. **@ai-summary added**: Documents routing (ai.generate vs ai.generateStream), error classification via error-adapter.ts, raw/text distinction, streaming behavior, and tool call extraction mapping.

Quality gates: pnpm ci:local passes (typecheck + lint green).

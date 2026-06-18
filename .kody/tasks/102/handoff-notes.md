## Merge Conflict Resolution — PR #102

Resolved 34 conflicted files in `src/infra/llm/` where HEAD (PR branch) added standardized `@fileType`, `@domain`, `@pattern` JSDoc tags and origin/dev had more detailed `@ai-summary` descriptions.

### Resolution Strategy
All conflicts were asymmetric — HEAD added structured metadata tags while origin/dev added descriptive `@ai-summary` content. Resolution: take HEAD's `@fileType/@domain/@pattern` tags and merge in origin/dev's additional `@ai-summary` detail as extra sentences/paragraphs within the same tag block.

### Files Resolved
All 34 conflicted files in the PR:
- `chat-message-role.ts`, `context-policy.ts`, `doc-chunk-types.ts`, `doc-search.ts`, `embeddings.ts`
- `errors.ts`, `exercise-context.ts`
- `genkit/adapters/unified-adapter.ts`, `genkit/config-resolver.ts`
- `index.ts`, `maintenance.ts`, `memory-extraction.ts`, `models.ts`
- `multimodal/types.ts`, `observability.ts`, `prompt-resolver.server.ts`
- `providers/factory.ts`, `providers/shared/constants.ts`, `providers/shared/sleep.ts`, `providers/shared/validation.ts`
- `schemas/lesson-duplication-output.ts`
- `services/answer-validation-service.ts`, `services/content-translation-service.ts`, `services/data-extractor-service.ts`, `services/exercise-chat-service.ts`, `services/image-optimizer-service.ts`
- `services/interactive-lesson/cache-schema-version.ts`, `interactive-lesson-schema.ts`, `interactive-lesson-types.ts`, `published-prompt-cache.ts`
- `services/support-generation-prompt-builder.ts`, `summary.ts`, `vector-index-check.ts`

### Verification
- `pnpm typecheck` — pass
- `pnpm lint` — pass (pre-existing warnings only, unrelated to changes)
- No conflict markers remain in any file

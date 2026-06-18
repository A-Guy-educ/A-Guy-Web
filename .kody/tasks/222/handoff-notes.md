## What was done

Applied review feedback to PR #222 (task 103 doc-coverage + task 222 merge conflict resolution).

Two types of fixes:

1. **BLOCK fix — published-prompt-cache.ts**: Removed the false claim that "Prompts afterChange/afterDelete hook eagerly calls invalidatePublishedInteractiveLessonPrompt()". Verified by cross-file grep: the function has zero callers. Replaced with "invalidatePublishedInteractiveLessonPrompt() exists for manual use but has no hook wiring it."

2. **WARN fix — 8 files with duplicate @ai-summary tags**: The prior merge concatenated two JSDoc blocks rather than synthesizing one. Each file now has a single synthesized @ai-summary:
   - genkit-instance.ts: merged process-scoped cache description with 30s ConfigValues TTL note
   - retry.ts: merged exponential backoff description with error-wrap / cause-chain note
   - timeout.ts: merged Promise.race description with background-operation / AbortController note
   - media-reader.ts: merged two-tier description with blob URL fetch tier and 30s timeout note
   - shared/index.ts: merged barrel re-export description with internal-file-structure-isolation note
   - prompt-composer.server.ts: merged 11-section description with budget-truncation specifics
   - validation.ts: merged input validation description with LLMError / boundary-note note
   - system-prompts.server.ts: merged ASC order description with graceful-degradation / overrideAccess note

Quality gates: `verify` passes (typecheck, lint, format all clean).

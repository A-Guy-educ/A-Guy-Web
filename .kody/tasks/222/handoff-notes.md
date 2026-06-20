## What was done

Round 4 fix — applied remaining review feedback from PR #222.

**Four changes:**

1. **Missing @fileType/@domain tags (concern)** — `chat-message-role.ts` was the only file in `src/infra/llm/` without `@fileType` and `@domain` tags. Added `@fileType enum` and `@domain ai` after the `@ai-summary` block.

2. **Single-sentence @ai-summary (concern)** — `context-policy.ts:4` had one dense multi-clause @ai-summary. Split into two sentences: purpose (strict order is the contract) + gotcha (do not reorder without a version bump).

3. **Missing gotcha in @ai-summary (concern)** — `cache-schema-version.ts` @ai-summary was purpose-only (no gotcha). Added a gotcha: "Prompt template changes do NOT need a bump (tracked by promptId + updatedAt separately); neither do new optional fields the converter tolerates." Restructured into clean purpose + gotcha.

4. **"never" too absolute (suggestion)** — `config-resolver.ts` @ai-summary said "never import MODEL_REGISTRY directly for runtime config" but the module does import it at line 18 for type access and fallback paths. Softened to "prefer it over importing MODEL_REGISTRY directly for runtime config (importing for type access or fallback paths is fine)."

**Verification:** `verify` passes (typecheck + lint clean on all modified files).

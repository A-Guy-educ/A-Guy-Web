## What was done

Round 2 fix — applied review feedback from PR #222.

**Single fix:** The function-level JSDoc on `invalidatePublishedInteractiveLessonPrompt()` (lines 70-73) still claimed "fired by the Prompts collection's afterChange / afterDelete hook" — the same false hook-wiring claim that the module-level `@ai-summary` had already been corrected to remove. The function-level comment was overlooked in the prior round.

**Change:** Replaced the lines 70-73 JSDoc with:
> "Drop the cached prompt. Exists for manual use — there is no hook that automatically calls this; the 30s TTL is the only invalidation mechanism. Safe to call when no entry is cached."

**Verification:** Grep across `src/infra/llm/` for `@ai-summary.*hook` and `afterChange|afterDelete` — no remaining hook-wiring claims. `verify` passes (typecheck + lint clean on modified files).

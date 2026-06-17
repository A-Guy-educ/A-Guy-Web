## PR #89 Review Fix

Applied review feedback from the code review of PR #71 (doc gap: src/infra/llm/).

### Change

Fixed malformed JSDoc block in `src/infra/llm/providers/shared/errors.ts:7`. The `@ai-summary` JSDoc block was missing its closing `*/` delimiter — the second `/**` on line 9 implicitly closed the first block in TypeScript's lenient parser, but the structure was malformed.

**Before:**
```ts
 * @ai-summary LLMError carries a retryable flag...

/** Error codes for LLM providers */
```

**After:**
```ts
 * @ai-summary LLMError carries a retryable flag...
 */

/** Error codes for LLM providers */
```

### Quality gates
- Typecheck: PASS
- Lint: PASS
- Format: PASS

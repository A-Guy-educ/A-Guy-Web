## PR #89 Review Fix

Applied review feedback from the code review of PR #71 (doc gap: src/infra/llm/).

### Change

Added `@ai-summary` JSDoc header to `src/infra/llm/providers/shared/errors.ts:7`. The closing `*/` on line 8 was already present in the dev branch — only the `@ai-summary` line was added in this PR.

### Quality gates
- Typecheck: PASS
- Lint: PASS
- Format: PASS

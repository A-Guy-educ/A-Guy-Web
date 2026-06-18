Resolved merge conflicts from `git merge origin/dev` into PR #89 (branch: 71-doc-gap-srcinfrallm-21-files-10-ai-summary-coverag).

All 47 conflicted files in src/infra/llm/ had symmetric conflicts in @ai-summary JSDoc tags. Resolution strategy: merged both HEAD's concise trap-focused summaries with origin/dev's longer detailed explanations into comprehensive combined @ai-summary tags.

Quality gates passed:
- `pnpm typecheck` — clean
- `pnpm lint` — clean (pre-existing warnings only, none introduced by these changes)

The wrapper should now be able to `git add` the resolved files and complete the merge.

Resolved merge conflicts between PR #216 branch and origin/dev for 5 files under src/infra/loading/.

All conflicts were asymmetric — the PR branch (HEAD) had richer multi-line `@ai-summary` block comments while origin/dev had simpler single-line `// @ai-summary` comments. Since the PR's purpose is doc coverage, took HEAD's more detailed summaries for all conflicts.

Files resolved:
- Spinner.tsx — took HEAD block comment with detailed ai-summary
- SystemLink.tsx — took HEAD block comment with detailed ai-summary
- useAsyncAction.ts — took HEAD block comment with detailed ai-summary
- useLoadingState.ts — took HEAD block comment with detailed ai-summary
- resolveHref.ts — took HEAD block comment (merged duplicate comment structure)

Typecheck passes; lint warnings are pre-existing and unrelated to these files.

Resolved all 38 merge conflicts from `git merge origin/dev` into PR branch `103-doc-coverage-srcinfrallm-aillm-infrastructure-laye`.

All conflicts were symmetric JSDoc-only conflicts at the top of each file. HEAD had added concise structural tags (`@fileType`, `@domain`, `@pattern`) while origin/dev had added verbose `@ai-summary` content. Resolution strategy: kept HEAD's structural tags where present, merged both sides' `@ai-summary` content by concatenation, and dropped origin/dev's redundant description lines that duplicated HEAD's summary.

No functional TypeScript code was modified — only JSDoc comment blocks.

Quality gates: `pnpm typecheck` clean, `pnpm lint` shows only pre-existing warnings, `pnpm format:check` all clean.

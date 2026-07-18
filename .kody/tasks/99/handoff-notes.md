## What was done

Added `@ai-summary` JSDoc headers to 51 files in `src/infra/llm/` (folder entry point + 50 TypeScript modules). Each summary captures:

1. **Why** the module exists (its purpose in the architecture)
2. **The load-bearing trap** — the silent failure mode or non-obvious constraint that could break if misunderstood

The summaries follow the established `@fileType`/`@domain`/`@pattern` convention already present in some files.

## Key changes

- `src/infra/llm/index.ts` — folder-level header documenting the facade entry point, provider detection gotcha, and error classifier fragility
- All other files in `src/infra/llm/` with TypeScript logic received `@ai-summary` headers; only the markdown prompt files were left unchanged (they're pure string data, not logic modules)

## Verification

- `pnpm typecheck` — passes
- `pnpm lint` — no new errors in `src/infra/llm/`
- `pnpm format` — all 51 files are formatted correctly (no diffs needed)

## Status

Branch is ready to commit. No code logic was changed — only JSDoc comments added. No test failures expected from this change.

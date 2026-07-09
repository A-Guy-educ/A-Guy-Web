## Issue #71: Add @ai-summary JSDoc headers to src/infra/llm/ source files

### What was done
Added `@ai-summary` JSDoc headers to 28+ TypeScript source files in `src/infra/llm/` that previously lacked them. Coverage went from ~10% (2/21) to 100%.

### Key trap that caused major rework
The original approach was to append `@ai-summary` lines to existing complete JSDoc blocks. This inadvertently removed the closing `*/` from those blocks. Every edited file had the same bug — missing `*/` after the new `@ai-summary` line — causing TypeScript parse errors (TS1010, TS1128) in all 28 files. All had to be re-edited to insert ` */` between the `@ai-summary` line and the first `import`.

### Pattern to remember
When adding a `@ai-summary` to an existing multi-line JSDoc block, always ensure the `*/` closing delimiter is preserved on its own line before any imports. A programmatic scan caught 10+ remaining instances that manual per-file reads missed.

### Quality gates
- Typecheck: PASS
- Lint: PASS (only pre-existing warnings in unrelated files)
- Integration tests: 195/195 PASS
- Format: PASS

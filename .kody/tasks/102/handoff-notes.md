## What was done

Added the missing `@fileType`/`@domain`/`@pattern` annotation trio to 10 files flagged in the PR #102 review. All 10 now carry the same consistent tag set as their peer files:

- 7 files missing all three tags: added `@fileType`, `@domain`, `@domain` (or appropriate type), and `@pattern`
- 3 files (`sleep.ts`, `constants.ts`, `validation.ts`) missing only `@pattern` — added that single tag

## Pattern choices

| File | @fileType | @pattern |
|------|-----------|----------|
| interactive-lesson-types.ts | types | data-transfer |
| lesson-duplication-variation-service.ts | service | variation |
| schemas/lesson-duplication-output.ts | schema | schema |
| interactive-lesson-generation-service.ts | service | generation |
| lesson-to-guided-explanation.ts | utility | renderer |
| published-prompt-cache.ts | utility | cache |
| support-generation-prompt-builder.ts | utility | prompt-builder |
| sleep.ts | utility | utility |
| constants.ts | constants | constants |
| validation.ts | validation | validation |

## Bug fixed

`published-prompt-cache.ts` had an additional issue: my initial tag insertion truncated the doc comment too early, leaving an orphaned `* which is acceptable...` line dangling inside the closed JSDoc block. Fixed by merging it into the closing `*/` line.

## Verification

`pnpm ci:local` — typecheck, lint, format all pass (attempt 2). The pre-existing lint warnings in `FormulaSheetContent.tsx` and `LatexDocumentViewer/index.tsx` are unrelated to this change.

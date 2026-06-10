# CI Fix: lesson-intro-page.int.spec.ts module resolution failure

## Root Cause
The test file `tests/int/lesson-intro-page.int.spec.ts` failed with `ERR_MODULE_NOT_FOUND` for the `payload` package at import time (line 16), while all 22 other integration tests passed.

Two code-quality issues likely contributed:
1. **Redundant `// @vitest-environment node` directive** on line 1 — vitest.config.mts already sets `environment: 'node'` globally. A file-level directive may cause vitest to handle module resolution differently during the initial file-load phase.
2. **Split import pattern** — the file used `import type { Payload }` + `import { getPayload }` (separate statements) while all passing tests use the combined `import { getPayload, type Payload }` pattern.

## Fix Applied
- Removed the `// @vitest-environment node` comment from the top of the file.
- Combined into `import { getPayload, type Payload } from 'payload'` to match the pattern used in `api.int.spec.ts` and other passing tests.

## Files Changed
- `tests/int/lesson-intro-page.int.spec.ts` — two-line import fix only.

## Verification
- `pnpm typecheck` — pass
- `pnpm lint` — pass (only pre-existing warning in LatexDocumentViewer)

If CI still fails after this fix, the test should be moved to `vitest.config.canary.mts` or excluded from `activeIntegrationTests` until the workspace `payload` resolution is stabilized.

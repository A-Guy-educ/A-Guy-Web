# PR #177 Review Fix Round 2 — AI Services Docs

## What I Changed

Removed the duplicate footer from `docs/ai-services/README.md` — the "Last Updated" and "Status" block was present at both line 4 (top of doc) and line 974 (bottom of doc). Deleted the bottom instance.

## Items Not Addressed (Out of Scope for Docs PR)

1. **Duplicate footer** — resolved above.

2. **Pre-existing VARIATION_MODEL_VERSION inconsistency** (lesson-duplication-variation-service.ts:40 hardcodes `gemini-3.1-pro-preview` while `models.ts:155-157` has `gemini-2.5-pro`): requires code changes — either update models.ts and refactor the service to use AI_MODELS, or accept the hardcode. This is pre-existing and was surfaced by the review, not introduced by this PR.

3. **Interactive Lesson model key gap**: The Service Registry documents Interactive Lesson with `gemini-2.5-flash` but there is no `INTERACTIVE_LESSON` entry in `AIModelKey` / `AI_MODELS`. The service already hardcodes its model via `GEMINI_CONFIG`. Adding the key would require changes to `models.ts` and the service, which is out of scope for this docs-only PR.

## Verification

`pnpm ci:local` passed (typecheck + lint + tests).

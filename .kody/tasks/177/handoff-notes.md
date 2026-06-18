# PR #177 Review Fix — AI Services Docs

## What I Changed

Four targeted model name corrections in `docs/ai-services/README.md`:

1. **EXERCISE_CHAT in Service Registry table** (line 100): `gemini-3.1-flash-lite` → `gemini-3.1-flash-lite-preview` (matching `src/infra/llm/models.ts:145` and `constants.ts:53`)

2. **Lesson Duplication in Service Registry table** (line 103): `gemini-2.5-pro` → `gemini-3.1-pro-preview` (matching `VARIATION_MODEL_VERSION` at `lesson-duplication-variation-service.ts:40`)

3. **Model Config table** (lines 189–190): Both `LESSON_DUPLICATION_VARIATION_CREATIVE` and `LESSON_DUPLICATION_VARIATION_DETERMINISTIC` updated from `gemini-2.5-pro` → `gemini-3.1-pro-preview` (matching what the service actually calls, even though registry has `gemini-2.5-pro`)

4. **CORRECT code example** (line 120): Removed the hardcoded `model: 'gemini-2.0-flash-001'` from the CORRECT example — it was inconsistent with the PR's stated goal of retiring that model and contradicted the guidance at lines 165–171. The singleton pattern is still demonstrated without the misleading model name.

## Verification

`pnpm ci:local` passed (typecheck + lint + tests).

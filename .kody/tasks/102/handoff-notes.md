## Fix Round 2: Internal Duplicate Sentences in @ai-summary Blocks

PR #102 received CONCERNS feedback identifying internal repetition within @ai-summary blocks — the same information stated twice in slightly different words.

### What was fixed (12 files)

1. `schemas/lesson-duplication-output.ts` — removed second verbatim "Gemini's responseSchema collapses nested object arrays (issue #1748)"
2. `doc-search.ts` — collapsed "Falls back to an empty DocSearch instance" stated twice
3. `prompt-composer.server.ts` — collapsed IMAGE_HANDLING_INSTRUCTIONS conditional-append rules stated twice
4. `services/interactive-lesson/interactive-lesson-schema.ts` — removed second "stripUnsupportedKeys" sentence
5. `services/exercise-chat-service.ts` — removed second streaming restriction sentence
6. `providers/shared/media-reader.ts` — removed second three-tier fallback description
7. `prompt-resolver.server.ts` — removed second three-tier fallback description
8. `genkit-instance.ts` — collapsed repeated per-process cache paragraph
9. `providers/shared/index.ts` — added missing `@pattern barrel`
10. `providers/shared/errors.ts` — added missing `@pattern error-handling`
11. `providers/types.ts` — added missing `@pattern enum`
12. `teacher-profile-block.ts` — collapsed repeated block-format/regex sentence

### Verification
- `pnpm typecheck` — pass
- `pnpm lint` — pass
- No conflict markers, no duplicate `*/` issues

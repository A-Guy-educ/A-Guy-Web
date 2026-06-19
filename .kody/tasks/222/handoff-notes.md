## What was done

Round 3 fix — applied remaining review feedback from PR #222.

**Three changes:**

1. **Verbatim duplication (concern)** — `lesson-duplication-variation-service.ts:7` and `lesson-duplication-output.ts:4` both used "Gemini's responseSchema collapses nested object arrays into literal string arrays (issue #1748)" verbatim. Fixed: variation-service now says "Gemini's responseSchema misrenders nested object arrays as strings (issue #1748)"; output-schema now says "Gemini's responseSchema misrenders nested object arrays as string arrays (issue #1748)". Both convey the same gotcha with independent phrasing.

2. **Single-sentence @ai-summary (suggestion)** — `cache-schema-version.ts:4` was one compressed sentence with em-dashes. Split into two sentences (purpose + gotcha) matching the established convention in sibling `published-prompt-cache.ts`. The purpose clause now ends with a period after "evicted on read and regenerated"; the gotcha clause follows as a second sentence.

3. **Hook-wiring fix (prior round)** — function-level JSDoc on `invalidatePublishedInteractiveLessonPrompt()` had stale claim "fired by the Prompts collection's afterChange/afterDelete hook". Corrected to "Exists for manual use — there is no hook that automatically calls this".

**Verification:** `verify` passes (typecheck + lint clean on all modified files).

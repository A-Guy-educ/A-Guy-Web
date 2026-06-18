## What was done

Resolved 6 files in `src/infra/llm/services/interactive-lesson/` that still contained unresolved git merge conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>> origin/dev`) from the prior merge. All 6 were symmetric JSDoc-only conflicts — both competing `@ai-summary` descriptions were retained inside the markers.

Resolution approach per file:
- **cache-schema-version.ts**: Synthesized HEAD's focus on eviction behavior with origin/dev's guidance on what does/doesn't need a bump.
- **interactive-lesson-generation-service.ts**: Merged both summaries — responseSchema constraint + reliability primitives + TTS budget/non-fatal notes.
- **interactive-lesson-schema.ts**: Merged both summaries — keep flat (no $ref/$defs/oneOf) + stripUnsupportedKeys note + Zod validators as safety net.
- **interactive-lesson-types.ts**: Merged scene types description with audioBase64/TTS fallback note and rendering precedence rule.
- **lesson-to-guided-explanation.ts**: Merged scene rendering note with XSS guard (XML-escaping) and segment ID canonicalization.
- **published-prompt-cache.ts**: Merged TTL memoization with eager invalidation via afterChange hook, noting serverless instance isolation.

No functional TypeScript code was modified — only JSDoc comment blocks.

Quality gates: `pnpm typecheck` clean, `pnpm lint` shows pre-existing warnings only, `pnpm format:check` all clean. `verify` passes.

## Fix Round: Collapsed Duplicate @ai-summary Blocks

PR #102 received CONCERNS feedback: 12 files had two separate `@ai-summary` tags due to asymmetric merge conflict resolution, and 4 of those also had verbatim repeated sentences.

### What was fixed

15 files edited to collapse duplicate `@ai-summary` blocks into single coherent blocks:

1. `interactive-lesson-generation-service.ts` — merged two @ai-summary blocks (Gemini responseSchema/audio cache + two-pass approach)
2. `lesson-to-guided-explanation.ts` — merged two @ai-summary blocks (SVG rendering + XSS guard)
3. `lesson-duplication-variation-service.ts` — merged two @ai-summary blocks (two-pass variation + model pinning)
4. `providers/types.ts` — merged two @ai-summary blocks
5. `genkit-instance.ts` — merged two @ai-summary blocks
6. `teacher-profile-block.ts` — merged two @ai-summary blocks
7. `system-prompts.server.ts` — merged two @ai-summary blocks
8. `prompt-composer.server.ts` — merged two @ai-summary blocks
9. `providers/shared/timeout.ts` — merged two @ai-summary blocks
10. `providers/shared/index.ts` — merged two @ai-summary blocks
11. `providers/shared/media-reader.ts` — merged two @ai-summary blocks
12. `providers/shared/retry.ts` — merged two @ai-summary blocks
13. `schemas/lesson-duplication-output.ts` — removed duplicate sentence about Gemini responseSchema collapse
14. `chat-message-role.ts` — removed duplicate sentence about ChatRole vs AccountRole
15. `errors.ts` — merged two @ai-summary fragments into one
16. `genkit/config-resolver.ts` — removed duplicate sentence about config hierarchy

### Verification
- `pnpm typecheck` — pass
- `pnpm lint` — pass
- No conflict markers, no duplicate `*/` issues

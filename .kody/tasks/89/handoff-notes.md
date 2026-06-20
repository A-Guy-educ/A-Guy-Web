## PR #89 fix round 2: Two pre-existing @ai-summary inaccuracies corrected

### What was done
Fixed two @ai-summary descriptions that contradicted the code they documented:

**1. interactive-lesson-generation-service.ts:6** (ARCHITECTURE BLOCK)
- Problem: @ai-summary claimed the service uses `gemini-3.1-pro-preview`, but `GEMINI_CONFIG.modelName` at line 32 is `gemini-2.5-flash`.
- Fix: Updated summary to reference `GEMINI_CONFIG` as the source of truth instead of a hardcoded model name.

**2. media-validation.ts:7** (CORRECTNESS WARN)
- Problem: @ai-summary claimed "if a media record has no createdBy, it passes validation and returns a valid path regardless of actual ownership." The query at line 70 uses `{ createdBy: { equals: userId } }`, which does NOT match documents where `createdBy` is undefined/null. Those records land in `missingIds` (line 229) and are rejected as "Media not found or access denied" (lines 231-233). The summary described the inverse of the actual (more restrictive) behavior.
- Fix: Rewrote summary to accurately describe that missing/mismatched `createdBy` causes denial, not allowance.

### Quality gates
- Typecheck: PASS
- Lint: PASS
- Format: PASS

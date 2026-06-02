# Doc update for PR #2154 (issue #2250)

Updated `docs/exercises/README.md` to correct stale references after PR #2154.

## Changes made

1. **Rename**: Removed "PDF view" references throughout (PR #2154 renamed `pdfView` → `scrollView`)

2. **Data model**: The doc described an old Stage 0 model with `questionType`, `contentJson`, `answerSpecJson` fields — all replaced with the current block-based model (`content.blocks: ContentBlock[]`)

3. **Architecture diagram**: Updated `src/collections/Exercises.ts` → `src/server/payload/collections/Exercises/index.ts`, beforeValidate → beforeChange, removed "Stage 0" reference

4. **Supported Question Block Types section**: Replaced old `stem`/`answerSpecJson` JSON examples with correct block examples for all 8 question block types (`question_select` mcq/true_false, `question_free_response`, `question_table`, `question_matching`, `question_geometry`, `question_axis`, `question_multi_axis`)

5. **Content Block Types section**: Replaced old section (5 raw block types: axis_system, geometry, etc.) with new section listing all 12 actual `ContentBlockSchema` types with correct structure

6. **Testing section**: Updated stale "54 tests passing" count and test paths to current file locations

7. **Troubleshooting/Contributing**: Updated paths from `src/contracts/` to `src/server/payload/collections/Exercises/schemas.ts`

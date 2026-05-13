/**
 * Output schemas for the lesson-duplication variation pipeline.
 *
 * Passed to Genkit's `ai.generate({ output: { schema } })` so Gemini's
 * responseSchema mode refuses to emit non-conforming output.
 *
 * Status (2026-05-13):
 *  - `SolutionDerivationOutputSchema` (pass 2): IN USE. Small/well-bounded —
 *    Gemini handles it correctly. Verified live against gemini-2.5-pro.
 *  - `LessonVariationOutputSchema` (pass 1): NOT WIRED UP. Verified live that
 *    Gemini collapses the full content.blocks shape to `{ "content": "blocks" }`
 *    (treating the property name as a string value) regardless of whether the
 *    envelope is `.strict()` or `.passthrough()`. The schema is kept here as
 *    documentation of the intended shape and to seed the next attempt — when
 *    Genkit / Gemini structured-output support for nested object schemas
 *    improves, the variation service can opt back in by re-adding the
 *    `outputSchema: LessonVariationOutputSchema` argument to pass 1.
 *
 * Design notes:
 *  - Gemini's responseSchema implementation does not handle large discriminated
 *    unions, `.strict()` envelopes, or `additionalProperties: true` well.
 *    `ContentSchema` (the canonical Zod definition at
 *    src/server/payload/collections/Exercises/schemas.ts) is too rich to use
 *    directly. The pass-1 schema below is a deliberately relaxed shape that
 *    only constrains envelope + per-block `id`/`type`; block objects use
 *    `.passthrough()` so per-type fields survive.
 *  - `sanitizeAiBlocks` + `payload.create`'s strict Zod validation remain the
 *    canonical enforcement for pass-1 output.
 */
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Shared inline rich-text shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inline rich-text node — relaxed copy of the strict version in
 * collections/Exercises/schemas.ts. We accept any string for `format` so a
 * stale model output doesn't fail the whole generation; the strict schema at
 * payload.create still enforces 'md-math-v1'.
 *
 * No `.min(1)` constraints on strings: Gemini's `responseSchema` ignores
 * `minLength` and using it can cause it to silently downgrade the schema.
 * Empty strings are caught downstream by the strict Exercise Zod schema at
 * payload.create.
 */
const InlineRichTextSchema = z
  .object({
    type: z.literal('rich_text'),
    format: z.string(),
    value: z.string(),
    mediaIds: z.array(z.string()).optional(),
  })
  .passthrough()

// ─────────────────────────────────────────────────────────────────────────────
// Pass 1 — Creative pass (full exercise content)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One content block. We enforce only `id` and `type`; per-type fields differ
 * across the 12 block variants and Gemini's responseSchema cannot represent
 * the full discriminated union reliably. `.passthrough()` keeps everything
 * the model emits beyond those two keys.
 *
 * No `.min(1)` constraints — see note on InlineRichTextSchema. Empty `id`/
 * `type` would fail at payload.create's strict schema anyway.
 */
const VariationContentBlockSchema = z
  .object({
    id: z.string(),
    type: z.string(),
  })
  .passthrough()

/**
 * Schema for pass 1's output. The model returns a full `content.blocks` shape
 * matching the input exercise's block layout (same length, same ids, same
 * types), with question/hint/phrasing fields rewritten per the variation level.
 *
 * IMPORTANT: the envelope (top-level + `content`) does NOT use `.passthrough()`.
 * Gemini's responseSchema interpreter chokes on the resulting JSON Schema
 * (sets `additionalProperties: true` on the object, and Gemini was observed
 * to silently collapse output to `{ "content": "blocks" }` or
 * `{ "content": null }`). The envelope is closed; only the block objects
 * themselves use passthrough, because their per-type field set is too varied
 * to enumerate without a full discriminated union.
 */
export const LessonVariationOutputSchema = z.object({
  content: z.object({
    blocks: z.array(VariationContentBlockSchema),
  }),
})

export type LessonVariationOutput = z.infer<typeof LessonVariationOutputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Pass 2 — Deterministic derivation pass (solution + answer only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for pass 2's output. The model independently re-solves the new
 * question and returns just the solution/fullSolution/answer fields — these
 * overwrite whatever pass 1 wrote for the same fields (pass 1 cannot be
 * trusted to solve correctly at temp 0.7).
 *
 * `answer.correctOptionIds` is optional: not every question type carries it
 * (e.g. free-response, geometry, axis). The merge step in the variation
 * service only applies it when present.
 */
export const SolutionDerivationOutputSchema = z.object({
  solution: InlineRichTextSchema.optional(),
  fullSolution: InlineRichTextSchema.optional(),
  answer: z
    .object({
      correctOptionIds: z.array(z.string()).optional(),
    })
    .optional(),
})

export type SolutionDerivationOutput = z.infer<typeof SolutionDerivationOutputSchema>

/**
 * LLM Service Errors
 *
 * @ai-summary Error class for lesson duplication/variation failures. Distinct
 * from generic LLM errors so callers can distinguish "bad input" (user error)
 * from "model hallucinated" or "provider flaky" (retryable). VariationGenerationError
 * is thrown by the lesson duplication service only — it carries exerciseId so callers
 * can report which specific exercise failed in a batch. This is NOT a general LLM
 * error; most services use the LLMError from providers/shared/errors instead.
 *
 * @fileType error
 * @domain ai
 * @pattern domain-error
 */

export class VariationGenerationError extends Error {
  constructor(
    public readonly exerciseId: string,
    public readonly reason: string,
  ) {
    super(`Variation generation failed for exercise ${exerciseId}: ${reason}`)
    this.name = 'VariationGenerationError'
    if (Error.captureStackTrace) Error.captureStackTrace(this, VariationGenerationError)
  }
}

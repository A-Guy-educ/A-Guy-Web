/**
 * LLM Service Errors
 *
 * @ai-summary Error class for lesson duplication/variation failures. Distinct
 * from generic LLM errors so callers can distinguish "bad input" (user error)
 * from "model hallucinated" or "provider flaky" (retryable).
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

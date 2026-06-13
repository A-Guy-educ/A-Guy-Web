/**
 * LLM Service Errors
 *
 * @ai-summary VariationGenerationError signals a failed exercise variation, not an LLM failure; it is thrown by the variation service and caught by the orchestrator for admin review, not for retry.
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

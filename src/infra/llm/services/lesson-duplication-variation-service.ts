/**
 * Lesson Duplication Variation Service
 *
 * Generates variations for a single exercise at a time with light, medium, or deep
 * transformation levels. Called by the orchestrator in a concurrency-limited loop.
 *
 * Service signature: generateVariation({ exercise, level }): Promise<{ exercise: Exercise }>
 * One bad exercise must not sink the whole duplication run — invalid JSON gets one retry,
 * then the exercise is marked failed and the loop continues.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

import type { Payload } from 'payload'
import type { Exercise } from '@/payload-types'
import type { DuplicationLevel } from '@/server/payload/collections/LessonDuplications'
import type { AIModel, AIModelKey } from '../models'

import { getModelRegistryEntry, getProviderModelName } from '../models'
import { LLMProviderType } from '../providers/types'
import { logger } from '@/infra/utils/logger'
import { VariationGenerationError } from '../errors'

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Loading
// ─────────────────────────────────────────────────────────────────────────────

const PROMPT_MAP: Record<Exclude<DuplicationLevel, 'none'>, string> = {
  light: readFileSync(
    join(__dirname, '..', 'prompts', 'lesson-duplication-light-agent-prompt.md'),
    'utf-8',
  ),
  medium: readFileSync(
    join(__dirname, '..', 'prompts', 'lesson-duplication-medium-agent-prompt.md'),
    'utf-8',
  ),
  deep: readFileSync(
    join(__dirname, '..', 'prompts', 'lesson-duplication-deep-agent-prompt.md'),
    'utf-8',
  ),
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateVariationInput {
  exercise: Exercise
  level: Exclude<DuplicationLevel, 'none'>
}

/**
 * Generate a variation for a single exercise at the specified transformation level.
 *
 * On invalid JSON or schema mismatch from the LLM: retries once with the same prompt.
 * If the retry also fails, throws VariationGenerationError — the caller (orchestrator)
 * catches and records it as a failure without aborting the run.
 */
export async function generateVariation(
  input: GenerateVariationInput,
  payload: Payload,
): Promise<{ exercise: Exercise }> {
  const { exercise, level } = input
  const exerciseId = typeof exercise.id === 'string' ? exercise.id : String(exercise.id)

  const systemPrompt = PROMPT_MAP[level]
  const userPrompt = buildUserPrompt(exercise)

  let retryCount = 0
  const startTime = Date.now()

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { createGenkitUnifiedAdapter } = await import('../genkit/adapters/unified-adapter')
      const adapter = await createGenkitUnifiedAdapter(payload)
      const modelConfig = resolveModelConfig('LESSON_DUPLICATION_VARIATION')

      const result = await adapter.generateChatCompletion(
        {
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          model: modelConfig,
          acknowledgment: `Generating ${level} variation for exercise`,
        },
        payload,
      )

      const parsed = parseVariationResponse(result.text)

      const latencyMs = Date.now() - startTime
      logger.info({ latencyMs, level, exerciseId, retryCount }, '[LessonDuplicationVariation]')

      return { exercise: { ...exercise, ...parsed } }
    } catch (error) {
      if (isJsonParseError(error)) {
        retryCount++
        if (retryCount >= 1) {
          const latencyMs = Date.now() - startTime
          logger.error(
            { latencyMs, level, exerciseId, retryCount, err: error },
            '[LessonDuplicationVariation] Retry exhausted',
          )
          throw new VariationGenerationError(
            exerciseId,
            error instanceof Error ? error.message : 'Invalid JSON from LLM after retry',
          )
        }
        // Will retry
        continue
      }
      // Non-JSON error — throw immediately (not retryable in this service's scope)
      const latencyMs = Date.now() - startTime
      logger.error(
        { latencyMs, level, exerciseId, retryCount, err: error },
        '[LessonDuplicationVariation] Non-retryable error',
      )
      throw new VariationGenerationError(
        exerciseId,
        error instanceof Error ? error.message : 'Unknown error',
      )
    }
  }
  // Unreachable — loop exits only via throw
  throw new VariationGenerationError(exerciseId, 'Unexpected loop exit')
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildUserPrompt(exercise: Exercise): string {
  return `Generate a variation for the following exercise.\n\nInput exercise:\n${JSON.stringify(exercise, null, 2)}`
}

function parseVariationResponse(text: string): Partial<Exercise> {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .trim()

  return JSON.parse(cleaned) as Partial<Exercise>
}

function resolveModelConfig(modelKey: AIModelKey): AIModel {
  const entry = getModelRegistryEntry(modelKey)
  return {
    name: getProviderModelName(LLMProviderType.GEMINI, modelKey),
    ...entry,
    modelKey,
  }
}

function isJsonParseError(error: unknown): boolean {
  return error instanceof SyntaxError || (error instanceof Error && error.message.includes('JSON'))
}

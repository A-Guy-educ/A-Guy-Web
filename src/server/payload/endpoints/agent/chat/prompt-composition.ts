/**
 * Chat Prompt Composition
 * Handles fetching lesson context, prompts, and composing system instructions
 */
import type { Payload } from 'payload'
import type { Logger } from 'pino'

import { composeSystemInstructions } from '@/infra/llm/prompt-composer.server'
import { resolveAgentSystemPrompt } from '@/infra/llm/prompt-resolver.server'
import { fetchPublishedSystemPrompts } from '@/infra/llm/system-prompts.server'
import type { Prompt } from '@/payload-types'

import type { ResolvedContext } from './context-resolution'

interface LessonContext {
  lessonContextText?: string
  lessonPrompt: Prompt | null
}

/**
 * Fetch lesson context and prompt for direct lesson context
 */
async function fetchLessonContext(
  payload: Payload,
  lessonId: string,
  user: { id: string },
  reqLogger: Logger,
): Promise<LessonContext> {
  const lesson = await payload.findByID({
    collection: 'lessons',
    id: lessonId,
    depth: 0,
    user,
    overrideAccess: false,
  })

  const lessonContextText =
    (lesson as { lessonContextText?: string }).lessonContextText ?? undefined
  let lessonPrompt: Prompt | null = null

  // Fetch prompt separately if lesson has one (admin-only, requires override)
  if ((lesson as { prompt?: unknown }).prompt) {
    const promptId =
      typeof (lesson as { prompt: unknown }).prompt === 'string'
        ? (lesson as { prompt: string }).prompt
        : (lesson as { prompt: { id: string } }).prompt.id

    try {
      lessonPrompt = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: 'prompts' as any,
        id: promptId,
        overrideAccess: true, // Prompts are admin-only
      })) as Prompt | null
    } catch (error) {
      reqLogger.warn({ err: error, promptId, lessonId }, 'Failed to fetch lesson prompt')
    }
  }

  return { lessonContextText, lessonPrompt }
}

/**
 * Fetch lesson context for exercise (inherits from parent lesson)
 */
async function fetchExerciseLessonContext(
  payload: Payload,
  exerciseId: string,
  user: { id: string },
  reqLogger: Logger,
): Promise<LessonContext> {
  const exercise = await payload.findByID({
    collection: 'exercises',
    id: exerciseId,
    depth: 0,
    user,
    overrideAccess: false,
  })

  if (!(exercise as { lesson?: unknown }).lesson) {
    return { lessonContextText: undefined, lessonPrompt: null }
  }

  const lessonId =
    typeof (exercise as { lesson: unknown }).lesson === 'string'
      ? (exercise as { lesson: string }).lesson
      : (exercise as { lesson: { id: string } }).lesson.id

  try {
    const lesson = await payload.findByID({
      collection: 'lessons',
      id: lessonId,
      depth: 0,
      user,
      overrideAccess: true, // Use overrideAccess since student role may not have lesson read access
    })

    const lessonContextText =
      (lesson as { lessonContextText?: string }).lessonContextText ?? undefined
    let lessonPrompt: Prompt | null = null

    // Fetch prompt separately if lesson has one
    if ((lesson as { prompt?: unknown }).prompt) {
      const promptId =
        typeof (lesson as { prompt: unknown }).prompt === 'string'
          ? (lesson as { prompt: string }).prompt
          : (lesson as { prompt: { id: string } }).prompt.id

      try {
        lessonPrompt = (await payload.findByID({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: 'prompts' as any,
          id: promptId,
          overrideAccess: true,
        })) as Prompt | null
      } catch (error) {
        reqLogger.warn({ err: error, promptId, lessonId }, 'Failed to fetch lesson prompt')
      }
    }

    return { lessonContextText, lessonPrompt }
  } catch (error) {
    reqLogger.warn(
      { err: error, lessonId, exerciseId },
      'Failed to fetch lesson for exercise context, continuing without lesson context',
    )
    return { lessonContextText: undefined, lessonPrompt: null }
  }
}

/**
 * Fetch lesson context based on resolved context type
 */
export async function fetchLessonContextForContext(
  payload: Payload,
  context: ResolvedContext,
  user: { id: string },
  reqLogger: Logger,
): Promise<LessonContext> {
  if (context.relationTo === 'lessons') {
    return fetchLessonContext(payload, context.value, user, reqLogger)
  }

  if (context.relationTo === 'exercises') {
    return fetchExerciseLessonContext(payload, context.value, user, reqLogger)
  }

  return { lessonContextText: undefined, lessonPrompt: null }
}

export interface ComposedSystemInstructions {
  instructions: string
  promptResolution: {
    promptId?: string
    promptTitle?: string
    resolvedFrom: string
    fallbackReason?: string
  }
  systemPromptCount: number
}

/**
 * Compose full system instructions from all sources
 */
export async function composeFullSystemInstructions(
  payload: Payload,
  lessonPrompt: Prompt | null,
  lessonContextText: string | undefined,
  reqLogger: Logger,
): Promise<ComposedSystemInstructions> {
  // Fetch published system prompts (always included)
  const systemPromptsResult = await fetchPublishedSystemPrompts(payload)

  if (systemPromptsResult.count > 0) {
    reqLogger.info(
      {
        systemPromptCount: systemPromptsResult.count,
        systemPromptIds: systemPromptsResult.promptIds,
        systemPromptTitles: systemPromptsResult.promptTitles,
      },
      'Including system prompts',
    )
  }

  // Resolve system prompt using pre-loaded prompt object
  const promptResolution = await resolveAgentSystemPrompt(payload, lessonPrompt)

  reqLogger.info(
    {
      promptId: promptResolution.promptId,
      promptTitle: promptResolution.promptTitle,
      resolvedFrom: promptResolution.resolvedFrom,
      ...(promptResolution.fallbackReason && { fallbackReason: promptResolution.fallbackReason }),
    },
    'Resolved system prompt',
  )

  // Compose final system instructions
  const instructions = composeSystemInstructions(
    systemPromptsResult.templates,
    promptResolution.template,
    lessonContextText,
  )

  return {
    instructions,
    promptResolution,
    systemPromptCount: systemPromptsResult.count,
  }
}

/**
 * @fileType service
 * @domain notebook
 * @ai-summary Runs one notebook "Check" as an isolated tutor call. It never reads the conversation, so an earlier check cannot leak into this one, and it stores only the tutor's reply: the prompt and handwriting image are not saved anywhere.
 */
import { randomUUID } from 'crypto'

import type { NotebookCheckDebug, NotebookCheckLocale } from '@/infra/types/notebook'
import { TutorChatError } from '@/infra/types/tutor-chat'
import { logger } from '@/infra/utils/logger'
import { recordLlmUsage } from '@/server/services/llm-usage'
import { findOwnedMedia } from '@/server/services/media'
import { MongoTutorConversationRepository } from '@/server/services/tutor-chat/conversation-repository'
import type { TutorConversationRepository } from '@/server/services/tutor-chat/conversation-repository'
import type { TutorModelGateway, TutorModelPart } from '@/server/services/tutor-chat/model-gateway'
import { createTutorModelGateway } from '@/server/services/tutor-chat/runtime'
import { enforceTutorTurnPolicy } from '@/server/services/tutor-chat/turn-policy'
import { loadAttachmentPart } from '@/server/web-api/chat-attachments'
import {
  buildCheckInstructions,
  CHECK_RETRY_MESSAGE,
  CHECK_SYSTEM_PROMPT,
  parseCheckReply,
} from './check-prompt'

/** Grading should be repeatable, so well below the chat's temperature. */
const CHECK_TEMPERATURE = 0.2
/** Reading messy handwriting and solving the exercise takes more thought than a chat turn. */
const CHECK_THINKING_BUDGET = 4096
const CHECK_RATE_LIMIT = { rateLimit: 20, rateWindowMs: 60_000 }

export interface NotebookCheckInput {
  ownerId: string
  contextKey: string
  lessonId?: string
  inkBase64: string
  exerciseMediaId?: string
  locale: NotebookCheckLocale
  includeDebug: boolean
  traceId: string
  signal?: AbortSignal
}

export interface NotebookCheckResult {
  message: string
  conversationId: string
  contextKey: string
  debug?: NotebookCheckDebug
}

interface LoadedExercise {
  part: TutorModelPart
  url: string | null
}

export interface NotebookCheckDependencies {
  gateway: Pick<TutorModelGateway, 'generate'>
  conversations: Pick<TutorConversationRepository, 'getOrCreate' | 'appendMessage' | 'compact'>
  loadExercise: (ownerId: string, mediaId: string) => Promise<LoadedExercise | null>
  enforcePolicy: (ownerId: string) => Promise<void>
  recordUsage: typeof recordLlmUsage
}

async function loadExerciseImage(ownerId: string, mediaId: string) {
  const media = await findOwnedMedia(mediaId, ownerId)
  if (!media) return null
  const loaded = await loadAttachmentPart(media)
  if (loaded.kind !== 'part') return null
  return { part: loaded.part, url: typeof media.url === 'string' ? media.url : null }
}

function defaultDependencies(): NotebookCheckDependencies {
  return {
    gateway: createTutorModelGateway(),
    conversations: new MongoTutorConversationRepository(),
    loadExercise: loadExerciseImage,
    enforcePolicy: (ownerId) =>
      enforceTutorTurnPolicy({
        ownerId,
        rateKey: `chat:${ownerId}:notebook-check`,
        ...CHECK_RATE_LIMIT,
      }),
    recordUsage: recordLlmUsage,
  }
}

/** Each image is preceded by its label, so the model never relies on image order. */
function labelledParts(exercise: LoadedExercise | null, inkBase64: string): TutorModelPart[] {
  return [
    ...(exercise ? [{ text: 'EXERCISE:' }, exercise.part] : []),
    { text: 'STUDENT WORK:' },
    { inlineData: { mimeType: 'image/png', data: inkBase64 } },
  ]
}

export async function runNotebookCheck(
  input: NotebookCheckInput,
  deps: NotebookCheckDependencies = defaultDependencies(),
): Promise<NotebookCheckResult> {
  const startedAt = Date.now()
  const exercise = input.exerciseMediaId
    ? await deps.loadExercise(input.ownerId, input.exerciseMediaId)
    : null
  if (input.exerciseMediaId && !exercise) throw new TutorChatError('attachment_unavailable')

  await deps.enforcePolicy(input.ownerId)

  const prompt = buildCheckInstructions({ hasExercise: Boolean(exercise), locale: input.locale })
  const result = await deps.gateway.generate({
    system: CHECK_SYSTEM_PROMPT,
    prompt,
    parts: labelledParts(exercise, input.inkBase64),
    temperature: CHECK_TEMPERATURE,
    thinkingBudget: CHECK_THINKING_BUDGET,
    signal: input.signal,
  })
  if (result.inputTokens + result.outputTokens > 0) {
    await deps.recordUsage({
      userId: input.ownerId,
      lessonId: input.lessonId ?? null,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      model: result.model,
      callType: 'chat',
    })
  }

  const parsed = parseCheckReply(result.text)
  if (!parsed.message) throw new TutorChatError('provider_error')

  // A broken reply is never saved: the student just sees the retry message.
  const complete = parsed.verdict !== null && result.finishReason !== 'MAX_TOKENS'
  const conversation = await deps.conversations.getOrCreate(input.ownerId, input.contextKey)
  if (complete) {
    await deps.conversations.appendMessage(input.ownerId, conversation.id, {
      turnId: randomUUID(),
      role: 'assistant',
      content: parsed.message,
    })
    await deps.conversations.compact(input.ownerId, conversation.id)
  }

  const durationMs = Date.now() - startedAt
  // Metadata only: the transcription is a student's work and stays out of logs.
  logger.info(
    {
      traceId: input.traceId,
      model: result.model,
      verdict: parsed.verdict,
      finishReason: result.finishReason,
      thoughtsTokens: result.thoughtsTokens,
      hasExercise: Boolean(exercise),
      inkLength: input.inkBase64.length,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs,
    },
    'Notebook check completed',
  )

  return {
    message: complete ? parsed.message : CHECK_RETRY_MESSAGE[input.locale],
    conversationId: conversation.id,
    contextKey: input.contextKey,
    ...(input.includeDebug
      ? {
          debug: {
            traceId: input.traceId,
            model: result.model,
            temperature: CHECK_TEMPERATURE,
            durationMs,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            thoughtsTokens: result.thoughtsTokens ?? 0,
            finishReason: result.finishReason ?? null,
            system: CHECK_SYSTEM_PROMPT,
            prompt,
            exerciseUrl: exercise?.url ?? null,
            reading: parsed.reading,
            verdict: parsed.verdict,
            rawReply: result.text,
          },
        }
      : {}),
  }
}

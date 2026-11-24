/**
 * Gemini call behind the course composer: reads the student's request (text,
 * a homework photo, or both), classifies the intent, and picks up to three
 * lessons from the course's own list. Returns lesson ids, not prose titles,
 * so the composer can render real links.
 *
 * Uses the Gemini REST API directly (`generativelanguage.googleapis.com`).
 * We intentionally bypass the shared Genkit adapter — it crashes on Vercel's
 * Node runtime with `TypeError: (0, core_1.getEnv) is not a function`, which
 * is why the tutor-chat model gateway also hits the REST API directly.
 *
 * @fileType service
 * @domain ai
 */
import { z } from 'zod'

import { logger } from '@/infra/utils/logger'
import {
  buildUserMessage,
  getSystemPrompt,
  RESPONSE_SCHEMA,
  SUGGEST_INTENTS,
  type SuggestIntent,
} from './lessonSuggestPrompts'

export type { SuggestIntent } from './lessonSuggestPrompts'

export interface LessonSuggestInputLesson {
  id: string
  title: string
  chapter?: string
  type?: string
}

export interface LessonSuggestImage {
  mimeType: string
  /** Base64 without the `data:` prefix. */
  data: string
}

export interface GenerateLessonSuggestionInput {
  query: string
  locale: 'en' | 'he'
  courseTitle: string
  lessons: LessonSuggestInputLesson[]
  image?: LessonSuggestImage
}

export interface LessonSuggestion {
  intent: SuggestIntent
  message: string
  lessonIds: string[]
}

export interface GenerateLessonSuggestionResult {
  success: boolean
  suggestion?: LessonSuggestion
  error?: string
}

const MODEL = 'gemini-2.5-flash'
const REQUEST_TIMEOUT_MS = 15_000
const MAX_SUGGESTED_LESSONS = 3

const modelReplySchema = z.object({
  intent: z.enum(SUGGEST_INTENTS),
  message: z.string().min(1),
  lessons: z.array(z.number().int()),
})

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

function buildRequestBody(input: GenerateLessonSuggestionInput) {
  const text = buildUserMessage({ ...input, hasImage: Boolean(input.image) })
  const parts: Array<Record<string, unknown>> = [{ text }]
  if (input.image) {
    parts.push({ inline_data: { mime_type: input.image.mimeType, data: input.image.data } })
  }
  return {
    systemInstruction: { parts: [{ text: getSystemPrompt(input.locale) }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      // Classification + picking from a list needs no reasoning budget, and
      // thinking tokens count against maxOutputTokens.
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
}

/** Map the model's 1-based lesson numbers back to ids, dropping anything off-list. */
export function resolveLessonNumbers(
  numbers: number[],
  lessons: LessonSuggestInputLesson[],
): string[] {
  const ids = numbers.map((n) => lessons[n - 1]?.id).filter((id): id is string => Boolean(id))
  return [...new Set(ids)].slice(0, MAX_SUGGESTED_LESSONS)
}

export function parseModelReply(
  text: string,
  lessons: LessonSuggestInputLesson[],
): LessonSuggestion | null {
  try {
    const reply = modelReplySchema.parse(JSON.parse(text))
    return {
      intent: reply.intent,
      message: reply.message.trim(),
      lessonIds: resolveLessonNumbers(reply.lessons, lessons),
    }
  } catch {
    return null
  }
}

export async function generateLessonSuggestion(
  input: GenerateLessonSuggestionInput,
): Promise<GenerateLessonSuggestionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    logger.warn('[LessonSuggest] GEMINI_API_KEY not set')
    return { success: false, error: 'GEMINI_API_KEY not configured' }
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(buildRequestBody(input)),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    )

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      logger.error(
        { status: response.status, bodyText: bodyText.slice(0, 500) },
        '[LessonSuggest] Gemini REST call rejected',
      )
      return { success: false, error: `Gemini HTTP ${response.status}` }
    }

    const parsed = (await response.json()) as GeminiResponse
    const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    const suggestion = parseModelReply(text, input.lessons)
    if (!suggestion) {
      logger.warn({ text: text.slice(0, 500) }, '[LessonSuggest] Unparseable Gemini reply')
      return { success: false, error: 'Unparseable response from Gemini' }
    }

    return { success: true, suggestion }
  } catch (error) {
    logger.error({ err: error }, '[LessonSuggest] Gemini REST call failed')
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

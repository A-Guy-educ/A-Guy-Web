/**
 * Gemini call behind the exam prep plan's topic list: reads the topics (a
 * photo or PDF of the teacher's list, or typed text) and matches each to the
 * course's closest learning and practice lessons. Returns lesson ids, so the
 * plan links to real lessons; a number off the list, or pointing at a lesson
 * of the wrong type, is dropped.
 *
 * Gemini REST, like the composer's lesson suggestions (see
 * `generateLessonSuggestion` for why not the Genkit adapter).
 *
 * @fileType service
 * @domain ai
 */
import { z } from 'zod'

import { logger } from '@/infra/utils/logger'
import type { LessonSuggestInputLesson } from '@/server/services/lesson-suggest/generateLessonSuggestion'
import {
  buildUserMessage,
  getSystemPrompt,
  MAX_EXAM_TOPICS,
  RESPONSE_SCHEMA,
} from './examTopicsPrompts'

export interface ExamTopicsFile {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
  /** Base64 without the `data:` prefix. */
  data: string
}

export interface MatchExamTopicsInput {
  locale: 'en' | 'he'
  courseTitle: string
  lessons: LessonSuggestInputLesson[]
  text?: string
  file?: ExamTopicsFile
}

export interface MatchedExamTopic {
  label: string
  learningLessonId: string | null
  practiceLessonId: string | null
}

export interface MatchExamTopicsResult {
  success: boolean
  topics?: MatchedExamTopic[]
  error?: string
}

const MODEL = 'gemini-2.5-flash'
// A multi-page PDF takes longer to read than a homework photo.
const REQUEST_TIMEOUT_MS = 25_000

const modelReplySchema = z.object({
  topics: z.array(
    z.object({
      label: z.string(),
      learning: z.number().int(),
      practice: z.number().int(),
    }),
  ),
})

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

function buildRequestBody(input: MatchExamTopicsInput) {
  const text = buildUserMessage({
    locale: input.locale,
    courseTitle: input.courseTitle,
    text: input.text?.trim() ?? '',
    hasFile: Boolean(input.file),
    lessons: input.lessons,
  })
  const parts: Array<Record<string, unknown>> = [{ text }]
  if (input.file) {
    parts.push({ inline_data: { mime_type: input.file.mimeType, data: input.file.data } })
  }
  return {
    systemInstruction: { parts: [{ text: getSystemPrompt(input.locale) }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
}

/** The lesson a 1-based number points at, if it is on the list and of the wanted type. */
function lessonOfType(
  n: number,
  type: 'learning' | 'practice',
  lessons: LessonSuggestInputLesson[],
): string | null {
  const lesson = lessons[n - 1]
  return lesson && lesson.type === type ? lesson.id : null
}

export function parseModelReply(
  text: string,
  lessons: LessonSuggestInputLesson[],
): MatchedExamTopic[] | null {
  try {
    const reply = modelReplySchema.parse(JSON.parse(text))
    const seen = new Set<string>()
    const topics: MatchedExamTopic[] = []
    for (const topic of reply.topics) {
      const label = topic.label.trim()
      if (!label || seen.has(label)) continue
      seen.add(label)
      topics.push({
        label,
        learningLessonId: lessonOfType(topic.learning, 'learning', lessons),
        practiceLessonId: lessonOfType(topic.practice, 'practice', lessons),
      })
    }
    return topics.slice(0, MAX_EXAM_TOPICS)
  } catch {
    return null
  }
}

export async function matchExamTopics(input: MatchExamTopicsInput): Promise<MatchExamTopicsResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    logger.warn('[ExamTopics] GEMINI_API_KEY not set')
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
        '[ExamTopics] Gemini REST call rejected',
      )
      return { success: false, error: `Gemini HTTP ${response.status}` }
    }

    const parsed = (await response.json()) as GeminiResponse
    const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    const topics = parseModelReply(text, input.lessons)
    if (!topics) {
      logger.warn({ text: text.slice(0, 500) }, '[ExamTopics] Unparseable Gemini reply')
      return { success: false, error: 'Unparseable response from Gemini' }
    }
    return { success: true, topics }
  } catch (error) {
    logger.error({ err: error }, '[ExamTopics] Gemini REST call failed')
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

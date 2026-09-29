/**
 * Lightweight Gemini call that suggests lessons from the current course's
 * lesson list when the local title-substring search returns zero matches.
 * The model is constrained to only name lessons that appear in the provided
 * list; if nothing fits it must emit the exact fallback sentence so the UI
 * can localize it consistently.
 *
 * @fileType service
 * @domain ai
 */
import { createGenkitUnifiedAdapter } from '@/infra/llm/genkit/adapters/unified-adapter'
import { getModelRegistryEntry, getProviderModelName, type AIModel } from '@/infra/llm/models'
import { LLMProviderType } from '@/infra/llm/providers/types'
import type { Payload } from '@/infra/types/backend'
import { logger } from '@/infra/utils/logger'

export interface LessonSuggestInputLesson {
  title: string
  chapter?: string
}

export interface GenerateLessonSuggestionInput {
  query: string
  locale: 'en' | 'he'
  courseTitle: string
  lessons: LessonSuggestInputLesson[]
}

export interface GenerateLessonSuggestionResult {
  success: boolean
  message?: string
  error?: string
}

const MAX_LESSONS = 100

const SYSTEM_PROMPT_EN =
  'You help a student pick from a course’s lesson list. You are given the student’s request and the exact lesson titles available in this course. If any listed lessons could match the request (even loosely), reply with ONE short friendly sentence naming 1–3 of them by their exact titles. If nothing fits, reply ONLY with: "Sorry, no lessons seem to fit in this course." Never invent lessons that are not in the list. Reply in English.'

const SYSTEM_PROMPT_HE =
  'אתה עוזר לתלמיד לבחור שיעור מתוך רשימת שיעורים של קורס. תקבל את הבקשה של התלמיד ואת שמות השיעורים הקיימים בקורס. אם יש שיעורים שיכולים להתאים (גם באופן רופף) — ענה במשפט אחד קצר וידידותי בעברית, וציין 1–3 מהם בשמם המדויק. אם אין התאמה, ענה בדיוק כך: "מצטער, לא נמצאו שיעורים שמתאימים בקורס הזה." אל תמציא שיעורים שאינם ברשימה. ענה בעברית.'

function buildUserMessage(input: GenerateLessonSuggestionInput): string {
  const lessonLines = input.lessons
    .slice(0, MAX_LESSONS)
    .map((l) => `- ${l.title}${l.chapter ? ` (${l.chapter})` : ''}`)
    .join('\n')

  if (input.locale === 'he') {
    return `הקורס: ${input.courseTitle}\nהבקשה: ${input.query}\n\nרשימת שיעורים:\n${lessonLines}`
  }
  return `Course: ${input.courseTitle}\nStudent’s request: ${input.query}\n\nAvailable lessons:\n${lessonLines}`
}

export async function generateLessonSuggestion(
  input: GenerateLessonSuggestionInput,
  payload: Payload,
): Promise<GenerateLessonSuggestionResult> {
  try {
    const adapter = await createGenkitUnifiedAdapter(payload)

    const modelConfig: AIModel = {
      name: getProviderModelName(LLMProviderType.GEMINI, 'EXERCISE_CHAT'),
      ...getModelRegistryEntry('EXERCISE_CHAT'),
      modelKey: 'EXERCISE_CHAT',
    }

    const system = input.locale === 'he' ? SYSTEM_PROMPT_HE : SYSTEM_PROMPT_EN
    const userMessage = buildUserMessage(input)

    const result = await adapter.generateChatCompletion(
      {
        system,
        messages: [{ role: 'user', content: userMessage }],
        model: modelConfig,
        acknowledgment: '',
      },
      payload,
    )

    return { success: true, message: result.text.trim() }
  } catch (error) {
    logger.error({ err: error }, '[LessonSuggest] Gemini call failed')
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Lightweight Gemini call that suggests lessons from the current course's
 * lesson list when the local title-substring search returns zero matches.
 * The model is constrained to only name lessons that appear in the provided
 * list; if nothing fits it must emit the exact fallback sentence so the UI
 * can localize it consistently.
 *
 * Uses the Gemini REST API directly (`generativelanguage.googleapis.com`).
 * We intentionally bypass the shared Genkit adapter — it crashes on Vercel's
 * Node runtime with `TypeError: (0, core_1.getEnv) is not a function`, which
 * is why the tutor-chat model gateway also hits the REST API directly.
 *
 * @fileType service
 * @domain ai
 */
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
const MODEL = 'gemini-2.5-flash'
const REQUEST_TIMEOUT_MS = 15_000

const SYSTEM_PROMPT_EN =
  'You help a student pick from a course’s lesson list. You are given the student’s request and the exact lesson titles available in this course. If any listed lessons could match the request (even loosely — same topic, related sub-topic, or the word appears inside the title), reply with ONE short friendly sentence in English naming 1–3 of them by their exact titles. If nothing fits, reply ONLY with: "Sorry, no lessons seem to fit in this course." Never invent lessons that are not in the list.'

const SYSTEM_PROMPT_HE =
  'אתה עוזר לתלמיד לבחור שיעור מתוך רשימת שיעורים של קורס. תקבל את הבקשה של התלמיד ואת שמות השיעורים הקיימים בקורס. אם יש שיעורים שיכולים להתאים (גם באופן רופף — נושא זהה, תת־נושא קשור, או שהמילה מופיעה בתוך הכותרת) — ענה במשפט אחד קצר וידידותי בעברית, וציין 1–3 מהם בשמם המדויק. אם אין התאמה, ענה בדיוק כך: "מצטער, לא נמצאו שיעורים שמתאימים בקורס הזה." אל תמציא שיעורים שאינם ברשימה.'

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

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

export async function generateLessonSuggestion(
  input: GenerateLessonSuggestionInput,
): Promise<GenerateLessonSuggestionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    logger.warn('[LessonSuggest] GEMINI_API_KEY not set')
    return { success: false, error: 'GEMINI_API_KEY not configured' }
  }

  const system = input.locale === 'he' ? SYSTEM_PROMPT_HE : SYSTEM_PROMPT_EN
  const userMessage = buildUserMessage(input)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: userMessage }],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 512,
          },
        }),
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
    const text =
      parsed.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('')
        .trim() ?? ''

    if (!text) {
      logger.warn({ parsed }, '[LessonSuggest] Gemini returned empty text')
      return { success: false, error: 'Empty response from Gemini' }
    }

    return { success: true, message: text }
  } catch (error) {
    logger.error({ err: error }, '[LessonSuggest] Gemini REST call failed')
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

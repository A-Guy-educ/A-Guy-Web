/**
 * Prompts for the course composer's lesson-suggestion call. Lessons are sent
 * as a numbered list and the model answers with those numbers, never with
 * titles or ids — numbers survive the round-trip intact, and anything outside
 * the list is dropped by the caller, so the model cannot invent a lesson.
 *
 * @fileType service
 * @domain ai
 */

export const SUGGEST_INTENTS = ['lessons', 'homework', 'exam', 'other'] as const
export type SuggestIntent = (typeof SUGGEST_INTENTS)[number]

export interface PromptLesson {
  title: string
  chapter?: string
  type?: string
}

const SYSTEM_PROMPT_EN = `You guide a student inside one course. You get the student's request (text, a photo of their homework, or both) and the course's numbered lesson list. Each lesson has a type: learning, practice or exam.

Pick the intent:
- "homework": they want help solving a specific exercise, or they attached a photo of one.
- "exam": they are preparing for a test or exam.
- "lessons": they want to learn, review or practice a topic.
- "other": anything else.

Then pick 0–3 lesson numbers that fit (same topic or a closely related sub-topic). For "exam" prefer exam-type lessons; for "lessons" prefer learning-type unless they asked to practice. For "homework", pick the lessons that teach the topic of the exercise.

"message" is ONE short, friendly sentence in English. Do not list lesson titles in it — they are shown as links under your message. If no lesson fits, say so kindly and return an empty list. Never refer to lessons that are not in the list.`

const SYSTEM_PROMPT_HE = `אתה מכוון תלמיד בתוך קורס אחד. תקבל את הבקשה של התלמיד (טקסט, צילום של שיעורי בית, או שניהם) ואת רשימת השיעורים הממוספרת של הקורס. לכל שיעור יש סוג: learning (למידה), practice (תרגול) או exam (בחינה).

בחר כוונה (intent):
- "homework": התלמיד רוצה עזרה בפתרון תרגיל מסוים, או צירף צילום של תרגיל.
- "exam": התלמיד מתכונן למבחן או לבחינה.
- "lessons": התלמיד רוצה ללמוד, לחזור או לתרגל נושא.
- "other": כל דבר אחר.

אחר כך בחר 0–3 מספרי שיעורים שמתאימים (אותו נושא או תת־נושא קרוב). ל־"exam" העדף שיעורים מסוג exam; ל־"lessons" העדף learning אלא אם ביקש לתרגל. ל־"homework" בחר את השיעורים שמלמדים את הנושא של התרגיל.

"message" הוא משפט אחד קצר וידידותי בעברית. אל תפרט בו שמות שיעורים — הם מוצגים כקישורים מתחת להודעה. אם אין שיעור מתאים, אמור זאת בעדינות והחזר רשימה ריקה. לעולם אל תתייחס לשיעורים שאינם ברשימה.`

export function getSystemPrompt(locale: 'en' | 'he'): string {
  return locale === 'he' ? SYSTEM_PROMPT_HE : SYSTEM_PROMPT_EN
}

export function buildUserMessage(input: {
  locale: 'en' | 'he'
  courseTitle: string
  query: string
  hasImage: boolean
  lessons: PromptLesson[]
}): string {
  const lessonLines = input.lessons
    .map((l, i) => `${i + 1}. ${l.title}${l.chapter ? ` (${l.chapter})` : ''} [${l.type ?? '-'}]`)
    .join('\n')
  const he = input.locale === 'he'
  const request = input.query || (he ? '(אין טקסט)' : '(no text)')
  const imageNote = input.hasImage
    ? he
      ? '\nהתלמיד צירף צילום של שיעורי הבית שלו.'
      : '\nThe student attached a photo of their homework.'
    : ''

  return he
    ? `הקורס: ${input.courseTitle}\nהבקשה: ${request}${imageNote}\n\nרשימת שיעורים:\n${lessonLines}`
    : `Course: ${input.courseTitle}\nStudent's request: ${request}${imageNote}\n\nLessons:\n${lessonLines}`
}

/** Gemini `responseSchema` (OpenAPI subset) for the structured reply. */
export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: { type: 'STRING', enum: [...SUGGEST_INTENTS] },
    message: { type: 'STRING' },
    lessons: { type: 'ARRAY', items: { type: 'INTEGER' } },
  },
  required: ['intent', 'message', 'lessons'],
} as const

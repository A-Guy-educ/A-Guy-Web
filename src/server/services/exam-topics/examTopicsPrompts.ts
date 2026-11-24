/**
 * Prompts for reading an exam's topic list (the teacher's sheet as a photo or
 * PDF, or what the student typed) and matching each topic to the course. As
 * with the composer's suggestions, lessons go out as a numbered list and come
 * back as numbers, so the model cannot invent a lesson; 0 means none fits.
 *
 * @fileType service
 * @domain ai
 */

export const MAX_EXAM_TOPICS = 12

export interface PromptLesson {
  title: string
  chapter?: string
  type?: string
}

const SYSTEM_PROMPT_EN = `You help a student build a prep plan for an exam in one course. You get the exam's topics — a photo or file of the list the teacher handed out, or text the student typed — and the course's numbered lesson list. Each lesson has a type: learning, practice or exam.

1. Extract the exam topics: one short name per topic, as written (drop numbering and page references). At most ${MAX_EXAM_TOPICS}. If there are no topics, return an empty list.
2. For each topic pick the closest learning-type lesson and the closest practice-type lesson (same topic or a closely related sub-topic). Use 0 when no lesson of that type fits.

Never refer to lessons that are not in the list.`

const SYSTEM_PROMPT_HE = `אתה עוזר לתלמיד לבנות תוכנית הכנה לבחינה בקורס אחד. תקבל את נושאי הבחינה — צילום או קובץ של הרשימה שהמורה חילק/ה, או טקסט שהתלמיד כתב — ואת רשימת השיעורים הממוספרת של הקורס. לכל שיעור יש סוג: learning (למידה), practice (תרגול) או exam (בחינה).

1. חלץ את נושאי הבחינה: שם קצר לכל נושא, כפי שהוא כתוב (בלי מספור והפניות לעמודים). לכל היותר ${MAX_EXAM_TOPICS}. אם אין נושאים, החזר רשימה ריקה.
2. לכל נושא בחר את שיעור ה־learning הקרוב ביותר ואת שיעור ה־practice הקרוב ביותר (אותו נושא או תת־נושא קרוב). החזר 0 כשאין שיעור מתאים מאותו סוג.

לעולם אל תתייחס לשיעורים שאינם ברשימה.`

export function getSystemPrompt(locale: 'en' | 'he'): string {
  return locale === 'he' ? SYSTEM_PROMPT_HE : SYSTEM_PROMPT_EN
}

export function buildUserMessage(input: {
  locale: 'en' | 'he'
  courseTitle: string
  text: string
  hasFile: boolean
  lessons: PromptLesson[]
}): string {
  const lessonLines = input.lessons
    .map((l, i) => `${i + 1}. ${l.title}${l.chapter ? ` (${l.chapter})` : ''} [${l.type ?? '-'}]`)
    .join('\n')
  const he = input.locale === 'he'
  const topics = input.text || (he ? '(אין טקסט)' : '(no text)')
  const fileNote = input.hasFile
    ? he
      ? '\nהתלמיד צירף צילום או קובץ של רשימת הנושאים.'
      : '\nThe student attached a photo or file of the topic list.'
    : ''

  return he
    ? `הקורס: ${input.courseTitle}\nנושאי הבחינה: ${topics}${fileNote}\n\nרשימת שיעורים:\n${lessonLines}`
    : `Course: ${input.courseTitle}\nExam topics: ${topics}${fileNote}\n\nLessons:\n${lessonLines}`
}

/** Gemini `responseSchema` (OpenAPI subset) for the structured reply. */
export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    topics: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          learning: { type: 'INTEGER' },
          practice: { type: 'INTEGER' },
        },
        required: ['label', 'learning', 'practice'],
      },
    },
  },
  required: ['topics'],
} as const

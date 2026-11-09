/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Prompt and reply parser for checking one notebook page. The model transcribes the handwriting first and states a verdict in tags, so the verdict is grounded in what was written and both can be inspected in the debug panel; the tags are stripped before the student sees the reply.
 */
import {
  NOTEBOOK_CHECK_VERDICTS,
  type NotebookCheckLocale,
  type NotebookCheckVerdict,
} from '@/infra/types/notebook'

export const CHECK_SYSTEM_PROMPT = `You are A-Guy, a math and science tutor checking one page of a student's handwritten notebook.
You are accurate first and kind second: a warm tone never changes the verdict.
Use \\(...\\) for inline math and \\[...\\] for display math.`

const LANGUAGE: Record<NotebookCheckLocale, string> = {
  he: 'Hebrew, in a neutral (non-gendered) voice',
  en: 'English',
}

/** Shown instead of a reply that came back without its tags or was cut off. */
export const CHECK_RETRY_MESSAGE: Record<NotebookCheckLocale, string> = {
  he: 'לא הצלחנו להשלים את הבדיקה הפעם. אפשר ללחוץ שוב על "בדוק".',
  en: 'We could not finish checking this page. Please press Check again.',
}

const VERDICT_RULES = `Choose exactly one verdict:
- unrelated: the handwriting is not an attempt at this exercise (ordinary words, names, doodles, work on another problem). Say so plainly and invite the student to try. Do not praise it and do not discuss any solution steps.
- unreadable: you cannot make out what was written. Say what is unclear and ask them to rewrite it.
- incorrect: a step or the final answer is wrong. Point to the first wrong step and ask a guiding question. Do not reveal the full solution.
- incomplete: what is written is right so far but unfinished. Say what is right and ask about the next step.
- correct: the student's own written steps and answer match your solution.
Never credit the student for anything that is not in your transcription.`

const FORMAT = `Start your reply with these two tags, then write your message to the student:
<reading>exact transcription of the handwriting</reading>
<verdict>one of: ${NOTEBOOK_CHECK_VERDICTS.join(', ')}</verdict>`

export function buildCheckInstructions(input: {
  hasExercise: boolean
  locale: NotebookCheckLocale
}): string {
  const task = input.hasExercise
    ? `2. Solve the exercise in the image labelled EXERCISE yourself. It may have several parts; the student may have answered only some of them.
3. Compare the transcription with your solution, judging only the parts the student attempted.`
    : `2. No exercise was attached to this page, so check only whether the written math is correct in itself. If it is, use the verdict "correct" and say that you could not compare it to a specific exercise, and that cutting the exercise into the page allows a full check.`

  return `Check the notebook page in this message. This check stands alone: treat it as new work and rely only on the images here.

Work in this order:
1. Read the image labelled STUDENT WORK and transcribe exactly what is handwritten. Do not correct it or add anything.
${task}

${VERDICT_RULES}

${FORMAT}

Write the message in ${LANGUAGE[input.locale]}, in two to five sentences.`
}

const READING_TAG = /<reading>([\s\S]*?)<\/reading>/i
const VERDICT_TAG = /<verdict>\s*([a-z]+)\s*<\/verdict>/i

export interface ParsedCheckReply {
  message: string
  reading: string | null
  verdict: NotebookCheckVerdict | null
}

export function parseCheckReply(raw: string): ParsedCheckReply {
  const verdict = raw.match(VERDICT_TAG)?.[1]?.toLowerCase() as NotebookCheckVerdict | undefined
  return {
    message: raw.replace(READING_TAG, '').replace(VERDICT_TAG, '').trim(),
    reading: raw.match(READING_TAG)?.[1]?.trim() ?? null,
    verdict: verdict && NOTEBOOK_CHECK_VERDICTS.includes(verdict) ? verdict : null,
  }
}

/**
 * The question a student typed in the course composer before being handed
 * off to /ask. SSR-safe.
 *
 * Kept per Ask room (the conversation's `contextKey`) in sessionStorage, so it
 * never outlives the tab and one room can't pick up another room's question.
 * Read once: /ask takes it on mount to prefill the chat input.
 */

const ASK_PENDING_QUESTION_KEY_PREFIX = 'aguy:askPendingQuestion:'

export function writeAskPendingQuestion(contextKey: string, question: string): void {
  if (typeof window === 'undefined' || !question.trim()) return
  try {
    sessionStorage.setItem(`${ASK_PENDING_QUESTION_KEY_PREFIX}${contextKey}`, question.trim())
  } catch {
    // Storage blocked or full: the student just retypes the question.
  }
}

export function takeAskPendingQuestion(contextKey: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const key = `${ASK_PENDING_QUESTION_KEY_PREFIX}${contextKey}`
    const question = sessionStorage.getItem(key)
    sessionStorage.removeItem(key)
    return question
  } catch {
    return null
  }
}

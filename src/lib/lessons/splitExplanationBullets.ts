/**
 * @fileType utility
 * @domain lessons
 * @pattern explanation-bullets
 * @ai-summary Split an admin-authored lesson explanation into one bullet per
 *             line / sentence, never breaking inside `$...$` math.
 */

const SENTENCE_END = /[.!?]/
const LEADING_BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/

function splitLineIntoSentences(line: string): string[] {
  const sentences: string[] = []
  let current = ''
  let inMath = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    current += char
    if (char === '$' && line[i - 1] !== '\\') inMath = !inMath
    const next = line[i + 1]
    if (!inMath && SENTENCE_END.test(char) && (next === undefined || /\s/.test(next))) {
      sentences.push(current)
      current = ''
    }
  }

  return [...sentences, current]
}

/**
 * Each newline and each sentence end (`.`, `!`, `?` followed by whitespace)
 * starts a new bullet. Bullet markers the author already typed are dropped so
 * they don't double up with the rendered list marker.
 */
export function splitExplanationBullets(value?: string | null): string[] {
  if (!value) return []
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(LEADING_BULLET, ''))
    .flatMap(splitLineIntoSentences)
    .map((item) => item.trim())
    .filter(Boolean)
}

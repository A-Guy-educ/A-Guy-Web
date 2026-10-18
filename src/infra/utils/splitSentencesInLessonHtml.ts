/**
 * @fileType utility
 * @domain lesson-rendering
 * @ai-summary Inserts a <br/> after sentence-ending punctuation (`.`, `!`, `?`)
 * so each sentence in a lesson paragraph starts on its own visual line.
 *
 * The split happens on plain text segments between HTML tags, so KaTeX markup,
 * links and other tag content are left untouched.
 */

const SENTENCE_END_RE = /([.!?])(\s+)/g

/**
 * Scans HTML and inserts `<br/>` after sentence-ending punctuation that is
 * followed by whitespace. Only text that lives OUTSIDE HTML tags is touched;
 * attribute values and tag names stay as-is.
 */
export function splitSentencesInLessonHtml(html: string): string {
  if (!html) return ''

  let result = ''
  let depth = 0
  let buffer = ''

  const flushText = () => {
    if (!buffer) return
    result += buffer.replace(SENTENCE_END_RE, '$1<br/>')
    buffer = ''
  }

  for (let i = 0; i < html.length; i += 1) {
    const ch = html[i]
    if (ch === '<') {
      flushText()
      depth += 1
      result += ch
    } else if (ch === '>') {
      depth = Math.max(0, depth - 1)
      result += ch
    } else if (depth > 0) {
      result += ch
    } else {
      buffer += ch
    }
  }

  flushText()
  return result
}

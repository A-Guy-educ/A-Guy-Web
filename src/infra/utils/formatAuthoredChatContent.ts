/**
 * Reformats admin-authored hint / fullSolution text so it renders in a chat
 * bubble with the same visual rhythm as AI replies:
 *
 *   1. Every sentence sits in its own paragraph (blank line between). The
 *      chat markdown renderer (`ChatMessageContent`) only inserts the
 *      `mb-4` paragraph gap when sentences are separated by a blank line;
 *      a single `\n` is collapsed to a space.
 *   2. Every math expression is promoted to block math `\[...\]` on its own
 *      line. The rehype wrapper (`rehype-math-wrapper.ts`) only applies the
 *      `math-long` class (muted background + own row) to `.katex-display`
 *      or to inline math that happens to contain `\frac` / `\binom` / etc.;
 *      promoting everything to block form gives short expressions the same
 *      treatment.
 *
 * Why not do this in `ChatMessageContent` for all bubbles? Student bubbles,
 * welcome lines, and streamed AI replies would also get rewritten, and the
 * sentence splitter would mangle mid-sentence periods inside already-formatted
 * markdown. This utility is intentionally scoped to the places that post
 * authored hint/explanation strings — admin content that was never written
 * with chat rendering in mind.
 */

const MATH_SEGMENT_REGEX = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]+?\$|\\\([\s\S]*?\\\))/g

/**
 * Insert a paragraph break after sentence-ending punctuation when it is
 * followed by whitespace and a Latin or Hebrew letter. The letter lookahead
 * is what keeps "1.5" or "e.g." from being split — only prose boundaries
 * trip it. Hebrew block is U+0590 – U+05FF.
 */
function splitSentencesInProse(text: string): string {
  return text.replace(/([.!?])\s+(?=[A-Za-z֐-׿])/g, '$1\n\n')
}

/**
 * Strip the matched delimiter pair and re-wrap as block math `\[...\]`
 * surrounded by blank lines so it lands on its own row.
 */
function promoteMathToBlock(segment: string): string {
  let inner: string
  if (segment.startsWith('$$') && segment.endsWith('$$')) {
    inner = segment.slice(2, -2)
  } else if (segment.startsWith('\\[') && segment.endsWith('\\]')) {
    inner = segment.slice(2, -2)
  } else if (segment.startsWith('\\(') && segment.endsWith('\\)')) {
    inner = segment.slice(2, -2)
  } else if (segment.startsWith('$') && segment.endsWith('$')) {
    inner = segment.slice(1, -1)
  } else {
    return segment
  }
  return `\n\n\\[${inner.trim()}\\]\n\n`
}

export function formatAuthoredChatContent(content: string): string {
  if (!content) return content

  const segments = content.split(MATH_SEGMENT_REGEX)
  const processed = segments.map((segment, index) => {
    if (!segment) return segment
    // String.split with a capturing group yields alternating text / match
    // chunks: even indices are prose between math regions, odd indices are
    // the math regions themselves.
    return index % 2 === 1 ? promoteMathToBlock(segment) : splitSentencesInProse(segment)
  })

  return processed
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

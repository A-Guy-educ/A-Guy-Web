/**
 * Replace $...$ and $$...$$ inline/display math in an admin-authored HTML
 * string with KaTeX-rendered HTML, so the caller can inject the result with
 * `dangerouslySetInnerHTML`. Kept local to ContentPageBodyRenderer because
 * the shared MathMarkdown component (used by chat and exercises) still needs
 * to escape raw HTML.
 */
import katex from 'katex'

// Display matches consume their delimiters first; the right-context guard
// (?!\d) is best-effort to avoid catching currency like "$5".
const MATH_RE = /(?<!\\)\$\$([\s\S]+?)\$\$(?!\d)|(?<!\\)\$([\s\S]+?)\$(?!\d)/g

export function htmlWithMath(html: string): string {
  if (!html?.trim()) return ''
  return html.replace(
    MATH_RE,
    (_match, display: string | undefined, inline: string | undefined) => {
      if (display !== undefined) {
        return katex.renderToString(display, {
          displayMode: true,
          throwOnError: false,
          strict: false,
        })
      }
      if (inline !== undefined) {
        return katex.renderToString(inline, {
          displayMode: false,
          throwOnError: false,
          strict: false,
        })
      }
      return _match
    },
  )
}

/**
 * Replace $...$ and $$...$$ inline/display math in an admin-authored HTML
 * string with KaTeX-rendered HTML, so the caller can inject the result with
 * `dangerouslySetInnerHTML`. Kept local to ContentPageBodyRenderer because
 * the shared MathMarkdown component (used by chat and exercises) still needs
 * to escape raw HTML.
 *
 * Each rendered math expression is wrapped with `dir="ltr"` and the `isolate`
 * utility to match rehypeMathWrapper in MathMarkdown — without it, browsers
 * apply bidi text reordering to math on Hebrew (RTL) pages and the formulas
 * render broken.
 */
import katex from 'katex'

// Display matches consume their delimiters first; the right-context guard
// (?!\d) is best-effort to avoid catching currency like "$5".
const MATH_RE = /(?<!\\)\$\$([\s\S]+?)\$\$(?!\d)|(?<!\\)\$([\s\S]+?)\$(?!\d)/g

function wrapInline(rendered: string): string {
  return `<span dir="ltr" class="isolate inline-block align-middle">${rendered}</span>`
}

function wrapDisplay(rendered: string): string {
  return `<div dir="ltr" class="isolate block text-center mt-3 mb-3">${rendered}</div>`
}

export function htmlWithMath(html: string): string {
  if (!html?.trim()) return ''
  return html.replace(
    MATH_RE,
    (_match, display: string | undefined, inline: string | undefined) => {
      if (display !== undefined) {
        return wrapDisplay(
          katex.renderToString(display, {
            displayMode: true,
            throwOnError: false,
            strict: false,
          }),
        )
      }
      if (inline !== undefined) {
        return wrapInline(
          katex.renderToString(inline, {
            displayMode: false,
            throwOnError: false,
            strict: false,
          }),
        )
      }
      return _match
    },
  )
}

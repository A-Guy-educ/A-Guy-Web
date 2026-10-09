/**
 * Serializer between the wire format used across the chat/exercise pipeline
 * (markdown with inline math wrapped in `$...$`) and MathLive's mixed-mode
 * LaTeX output (text runs wrapped in `\text{...}`, math atoms raw).
 */

const TEXT_ESCAPE_RE = /[\\{}$]/g
const TEXT_UNESCAPE_RE = /\\([\\{}$])/g

function escapeTextForLatex(s: string): string {
  return s.replace(TEXT_ESCAPE_RE, (ch) => `\\${ch}`)
}

function unescapeTextFromLatex(s: string): string {
  return s.replace(TEXT_UNESCAPE_RE, '$1')
}

/**
 * Convert the markdown wire format to MathLive LaTeX.
 *   `solve $x^2 = 4$ now` → `\text{solve }x^2 = 4\text{ now}`
 */
export function markdownToLatex(md: string): string {
  if (!md) return ''
  const parts: string[] = []
  let i = 0
  while (i < md.length) {
    const openIdx = md.indexOf('$', i)
    if (openIdx === -1) {
      parts.push(`\\text{${escapeTextForLatex(md.slice(i))}}`)
      break
    }
    if (openIdx > i) parts.push(`\\text{${escapeTextForLatex(md.slice(i, openIdx))}}`)
    const closeIdx = md.indexOf('$', openIdx + 1)
    if (closeIdx === -1) {
      // Unterminated `$` — treat the remainder as plain text so students
      // don't lose characters mid-type while a formula is in flight.
      parts.push(`\\text{${escapeTextForLatex(md.slice(openIdx))}}`)
      break
    }
    const mathContent = md.slice(openIdx + 1, closeIdx).trim()
    if (mathContent) parts.push(mathContent)
    i = closeIdx + 1
  }
  return parts.join('')
}

/**
 * Convert MathLive's mixed-mode LaTeX back to the markdown wire format.
 * Text runs collapse into plain prose; math runs are wrapped in `$...$`.
 */
export function latexToMarkdown(latex: string): string {
  if (!latex) return ''
  const out: string[] = []
  let mathBuffer = ''
  const flushMath = () => {
    const trimmed = mathBuffer.trim()
    if (trimmed) out.push(`$${trimmed}$`)
    mathBuffer = ''
  }
  let i = 0
  while (i < latex.length) {
    if (latex.startsWith('\\text{', i)) {
      flushMath()
      i += 6
      let depth = 1
      let text = ''
      while (i < latex.length && depth > 0) {
        const ch = latex[i]
        if (ch === '\\' && i + 1 < latex.length) {
          text += ch + latex[i + 1]
          i += 2
          continue
        }
        if (ch === '{') {
          depth++
          text += ch
          i++
          continue
        }
        if (ch === '}') {
          depth--
          if (depth > 0) text += ch
          i++
          continue
        }
        text += ch
        i++
      }
      out.push(unescapeTextFromLatex(text))
    } else {
      mathBuffer += latex[i]
      i++
    }
  }
  flushMath()
  return out.join('')
}

import katex from 'katex'
import { isAllowedColorToken, isBlockColorToken } from '@/infra/utils/allowedColorTokens'

const MATH_RE =
  /(?<!\\)\$\$([\s\S]+?)\$\$(?!\d)|(?<!\\)\$\$([^$\n]+?)\$(?!\$|\d)|(?<!\\)\$([^$\n]+?)\$(?!\d)/g
const TAG_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype\b[^>]*>|<\/?[A-Za-z][^>]*>/gi
const DOLLAR_ENTITY_RE = /&(dollar|#36|#x24);/gi
const SKIP_TAGS = new Set(['code', 'pre', 'script', 'style', 'textarea'])
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const DECIMAL = String.raw`-?(?:\d+(?:[.,]\d+)?|\d*[.,]\d+)`
const FRACTION = String.raw`-?\d+(?:[.,]\d+)?\s*[\/÷]\s*-?\d+(?:[.,]\d+)?`
const POWER = String.raw`${DECIMAL}\s*\^[^{}\s<]+`
const ARITHMETIC = String.raw`${DECIMAL}(?:\s*[\+\-\*×÷]\s*${DECIMAL})(?:[\s ‏]*[=<>≤≥]\s*${DECIMAL})?(?:\s*[\+\-\*×÷]\s*${DECIMAL})*`
const BARE_MATH_RE = new RegExp(`(^|[\\s ‏])(${FRACTION}|${POWER}|${ARITHMETIC})`, 'g')

type StackEntry = {
  name: string
  skip: boolean
}

function wrapInline(rendered: string, lengthClass: 'math-short' | 'math-long'): string {
  return `<span dir="ltr" class="isolate inline-block align-middle ${lengthClass}">${rendered}</span>`
}

function wrapDisplay(rendered: string): string {
  return `<div dir="ltr" class="isolate block text-center mt-3 mb-3 math-long">${rendered}</div>`
}

function canRenderInlineMath(source: string): boolean {
  const value = source.trim()
  if (!value) return false
  if (/^[A-Za-z]$/.test(value)) return true
  return /[\\^_{}=<>+\-*×÷/]|\d[A-Za-z]|[A-Za-z]\d/.test(value)
}

/**
 * Decide whether inline math (`$...$`) should render in the bigger
 * `.math-long` CSS treatment (own row + highlighted background) rather than
 * inline reading-size `.math-short`.
 *
 * We promote in two cases:
 *   1. Function definitions `name(args) = ...` — the right-hand side is a
 *      distinct piece of structure students benefit from seeing clearly.
 *   2. Expressions containing vertically-stacked LaTeX constructs
 *      (`\frac`, `\dfrac`, `\tfrac`, `\binom`, `\begin{...}`) — these always
 *      take more than one baseline of height and feel cramped inline.
 *
 * Simple inline equations like `$2x+3=5$` or atoms like `$x$` deliberately
 * stay inline so they don't dwarf the surrounding prose.
 *
 * Mirrors shouldPromoteInlineMath in rehype-math-wrapper.ts — keep them in sync.
 */
function shouldPromoteInlineMath(source: string): boolean {
  const value = source.trim()
  if (!value) return false
  if (/^[A-Za-z]+\s*\([A-Za-z0-9, ]*\)\s*=/.test(value)) return true
  return /\\(?:d|t)?frac\b|\\binom\b|\\begin\{/.test(value)
}

function renderMath(source: string, displayMode: boolean): string | null {
  const value = source.trim()
  if (!value) return null
  if (!displayMode && !canRenderInlineMath(value)) return null

  const rendered = katex.renderToString(value, {
    displayMode,
    throwOnError: false,
    strict: false,
    trust: false,
  })

  if (displayMode) return wrapDisplay(rendered)
  const lengthClass = shouldPromoteInlineMath(value) ? 'math-long' : 'math-short'
  return wrapInline(rendered, lengthClass)
}

function renderBareMathInText(text: string): string {
  BARE_MATH_RE.lastIndex = 0
  return text.replace(BARE_MATH_RE, (match, prefix: string, source: string) => {
    const rendered = renderMath(source, false)
    return rendered ? `${prefix}${rendered}` : match
  })
}

function renderMathInText(text: string): string {
  const original = text.replace(DOLLAR_ENTITY_RE, '$')
  MATH_RE.lastIndex = 0

  let match: RegExpExecArray | null
  let lastIndex = 0
  let changed = false
  let renderedText = ''

  while ((match = MATH_RE.exec(original))) {
    const [raw, display, malformedInline, inline] = match
    const isDisplay = display !== undefined
    const source = display ?? malformedInline ?? inline
    if (source === undefined) continue
    const rendered = renderMath(source, isDisplay)

    if (!rendered) continue

    renderedText += renderBareMathInText(original.slice(lastIndex, match.index))
    renderedText += rendered
    lastIndex = match.index + raw.length
    changed = true
  }

  if (!changed) return renderBareMathInText(original)

  renderedText += renderBareMathInText(original.slice(lastIndex))
  return renderedText
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Index of the `}` closing a token whose content starts at `contentStart`, or -1.
 * Math is still raw `$...$` at this stage, so its spans are found with the same
 * MATH_RE the math pass uses and their braces are not counted.
 */
function findColorTokenClose(text: string, contentStart: number): number {
  const mathSpans = [...text.slice(contentStart).matchAll(MATH_RE)].map((match) => ({
    start: contentStart + match.index,
    end: contentStart + match.index + match[0].length,
  }))

  let depth = 1
  let spanIndex = 0
  let index = contentStart
  while (index < text.length) {
    if (mathSpans[spanIndex]?.start === index) {
      index = mathSpans[spanIndex].end
      spanIndex += 1
      continue
    }
    if (text[index] === '{') depth += 1
    if (text[index] === '}') depth -= 1
    if (depth === 0) return index
    index += 1
  }
  return -1
}

function wrapColorToken(token: string, content: string, allowBlock: boolean): string {
  const tag = allowBlock && isBlockColorToken(token) ? 'div' : 'span'
  return `<${tag} class="aguy-${token}">${content}</${tag}>`
}

// Replaces ::<token>{content} with balanced braces, recursing into the content.
// Unknown tokens and unclosed tags fall through as literal text (matches the
// remark plugin behaviour). Callers are responsible for HTML-escaping the input
// first when the source is untrusted (e.g. Lexical text nodes); admin-authored
// HTML is trusted at authoring time and can be passed through as-is.
//
// `allowBlock` is false inside a <p>: a <div> there would be split out of the
// paragraph by the HTML parser, so block tokens stay <span> (block via CSS).
function renderColorTokensInText(text: string, allowBlock = true): string {
  const source = text.replace(DOLLAR_ENTITY_RE, '$')
  const markerRe = /::([a-z0-9-]+)\{/g

  let result = ''
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = markerRe.exec(source))) {
    const token = match[1]
    const contentStart = markerRe.lastIndex
    if (!isAllowedColorToken(token)) continue

    const close = findColorTokenClose(source, contentStart)
    if (close === -1) continue

    const content = renderColorTokensInText(source.slice(contentStart, close), allowBlock)
    result += source.slice(cursor, match.index) + wrapColorToken(token, content, allowBlock)
    cursor = close + 1
    markerRe.lastIndex = cursor
  }
  return result + source.slice(cursor)
}

export function renderTextWithMath(text: string): string {
  if (!text) return ''
  const escaped = escapeHtml(text)
  const colored = renderColorTokensInText(escaped)
  return renderMathInText(colored)
}

function extractBodyHtml(html: string): string {
  const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/i.exec(html)
  if (bodyMatch) return bodyMatch[1] ?? ''

  return html
    .replace(/^\s*<!doctype\b[^>]*>\s*/i, '')
    .replace(/^\s*<html\b[^>]*>\s*/i, '')
    .replace(/\s*<\/html\s*>\s*$/i, '')
}

function getTagName(tag: string): string | null {
  const match = /^<\/?\s*([A-Za-z][\w:-]*)/.exec(tag)
  return match?.[1]?.toLowerCase() ?? null
}

function hasKatexClass(tag: string): boolean {
  const match = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag)
  const className = match?.[1] ?? match?.[2] ?? match?.[3] ?? ''
  return className.split(/\s+/).includes('katex')
}

function closesTag(tag: string): boolean {
  return /^<\s*\//.test(tag)
}

function selfClosesTag(tag: string, name: string): boolean {
  return VOID_TAGS.has(name) || /\/\s*>$/.test(tag)
}

function closeStackEntry(stack: StackEntry[], name: string): void {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const entry = stack.pop()
    if (entry?.name === name) return
  }
}

function isSkippingText(stack: StackEntry[]): boolean {
  return stack.some((entry) => entry.skip)
}

function renderHtmlTextSegment(text: string, stack: StackEntry[]): string {
  if (isSkippingText(stack)) return text
  const insideParagraph = stack.some((entry) => entry.name === 'p')
  return renderMathInText(renderColorTokensInText(text, !insideParagraph))
}

/**
 * Renders admin-authored HTML with KaTeX math.
 *
 * This intentionally does not sanitize: HtmlBlock content is restricted to
 * trusted admins at authoring time. See `.ai-docs/knowledge/admin-html-content.md`.
 */
export function renderAdminHtmlWithMath(html: string): string {
  if (!html?.trim()) return ''

  const source = extractBodyHtml(html)
  const stack: StackEntry[] = []
  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  TAG_RE.lastIndex = 0
  while ((match = TAG_RE.exec(source))) {
    const tag = match[0]
    const text = source.slice(lastIndex, match.index)
    result += renderHtmlTextSegment(text, stack)
    result += tag

    const name = getTagName(tag)
    if (name) {
      if (closesTag(tag)) {
        closeStackEntry(stack, name)
      } else if (!selfClosesTag(tag, name)) {
        stack.push({ name, skip: SKIP_TAGS.has(name) || hasKatexClass(tag) })
      }
    }

    lastIndex = match.index + tag.length
  }

  result += renderHtmlTextSegment(source.slice(lastIndex), stack)
  return result
}

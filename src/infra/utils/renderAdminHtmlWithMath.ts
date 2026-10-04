import katex from 'katex'
import { isAllowedColorToken } from '@/infra/utils/allowedColorTokens'

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

function wrapInline(rendered: string, extraClasses: string[] = []): string {
  const classes = ['isolate', 'inline-block', 'align-middle', ...extraClasses].join(' ')
  return `<span dir="ltr" class="${classes}">${rendered}</span>`
}

function wrapDisplay(rendered: string, extraClasses: string[] = []): string {
  const classes = ['isolate', 'block', 'text-center', 'mt-3', 'mb-3', ...extraClasses].join(' ')
  return `<div dir="ltr" class="${classes}">${rendered}</div>`
}

function canRenderInlineMath(source: string): boolean {
  const value = source.trim()
  if (!value) return false
  if (/^[A-Za-z]$/.test(value)) return true
  return /[\\^_{}=<>+\-*×÷/]|\d[A-Za-z]|[A-Za-z]\d/.test(value)
}

/** True when the TeX source contains \frac / \binom (any size variant). */
function hasFractionMacro(source: string): boolean {
  return /\\(?:d|t)?frac\b|\\(?:d|t)?binom\b/.test(source)
}

/**
 * True when the TeX source combines a fraction with a superscript or subscript
 * anywhere in the expression — any of:
 *   - `\frac{10}{e^x}` (power in the denominator)
 *   - `\frac{e^x}{x^2 - x - 2}` (powers in both)
 *   - `e^{\frac{1}{x}}` (fraction inside a superscript)
 * These compound stacks tower far above the baseline, so plain `.math-tall`
 * isn't enough — the ascender collides with the line above unless we grow
 * the line box more aggressively via `.math-xtall`.
 */
function hasCompoundVerticalStack(source: string): boolean {
  if (!source) return false
  return hasFractionMacro(source) && /\^|_/.test(source)
}

/** Short atoms ("x", "AB", "\pi") read inline; everything else is "long". */
function classifyShort(source: string): boolean {
  if (source.length === 0) return false
  const normalised = source.replace(/\\[a-zA-Z]+/g, 'x')
  if (normalised.length > 3) return false
  if (/[=+/^_<>]/.test(normalised)) return false
  return true
}

function renderMath(source: string, displayMode: boolean): string | null {
  const value = source.trim()
  if (!value) return null
  if (!displayMode && !canRenderInlineMath(value)) return null

  // Inject \displaystyle for inline math containing a fraction. KaTeX's default
  // "textstyle" cramps numerator/denominator together; \displaystyle restores
  // the fuller block-math layout while the expression stays inline.
  const latex =
    !displayMode && hasFractionMacro(value) && !value.includes('\\displaystyle')
      ? `\\displaystyle ${value}`
      : value

  const rendered = katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    strict: false,
    trust: false,
  })

  // Tag the wrapper with the same math-short/math-long/math-tall/math-xtall
  // classes rehype-math-wrapper uses on the MathMarkdown path, so the single
  // set of CSS rules in globals.css handles both renderers uniformly.
  const stackClasses: string[] = []
  if (hasCompoundVerticalStack(value)) {
    stackClasses.push('math-tall', 'math-xtall')
  } else if (hasFractionMacro(value)) {
    // Plain fraction (no powers): display-styled numerator/denominator fit
    // in `.math-tall`'s line-box. Lone superscripts like `x^2` need no
    // special treatment and are left unflagged.
    stackClasses.push('math-tall')
  }

  if (displayMode) {
    return wrapDisplay(rendered, ['math-long', ...stackClasses])
  }
  const lengthClass = classifyShort(value) ? 'math-short' : 'math-long'
  return wrapInline(rendered, [lengthClass, ...stackClasses])
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

// Matches ::<token>{content} where token is [a-z0-9-]+ and content excludes '}'.
// Unknown tokens fall through as literal text (matches the remark plugin behaviour).
// Callers are responsible for HTML-escaping the input first when the source is
// untrusted (e.g. Lexical text nodes); admin-authored HTML is trusted at
// authoring time and can be passed through as-is.
const COLOR_TOKEN_RE = /::([a-z0-9-]+)\{([^}]*)\}/g

function renderColorTokensInText(text: string): string {
  return text.replace(COLOR_TOKEN_RE, (match, token: string, content: string) => {
    if (!isAllowedColorToken(token)) return match
    return `<span class="aguy-${token}">${content}</span>`
  })
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
    result += isSkippingText(stack) ? text : renderMathInText(renderColorTokensInText(text))
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

  const tail = source.slice(lastIndex)
  result += isSkippingText(stack) ? tail : renderMathInText(renderColorTokensInText(tail))
  return result
}

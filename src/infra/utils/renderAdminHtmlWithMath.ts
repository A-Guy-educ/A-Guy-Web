import katex from 'katex'
import { preprocessHtmlMath } from './preprocessHtmlMath'

const TEXT_NODE = 4
const MATH_RE = /(?<!\\)\$\$([\s\S]+?)\$\$(?!\d)|(?<!\\)\$([^$\n]+?)\$(?!\d)/g
const SKIP_SELECTOR = 'code, pre, script, style, textarea, .katex'

function wrapInline(rendered: string): string {
  return `<span dir="ltr" class="isolate inline-block align-middle">${rendered}</span>`
}

function wrapDisplay(rendered: string): string {
  return `<div dir="ltr" class="isolate block text-center mt-3 mb-3">${rendered}</div>`
}

function canRenderInlineMath(source: string): boolean {
  const value = source.trim()
  if (!value) return false
  if (/^[A-Za-z]$/.test(value)) return true
  return /[\\^_{}=<>+\-*×÷/]|\d[A-Za-z]|[A-Za-z]\d/.test(value)
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

  return displayMode ? wrapDisplay(rendered) : wrapInline(rendered)
}

function appendHtml(fragment: DocumentFragment, doc: Document, html: string): void {
  const template = doc.createElement('template')
  template.innerHTML = html
  fragment.append(template.content.cloneNode(true))
}

function renderMathInTextNode(textNode: Text, doc: Document): void {
  const original = textNode.textContent ?? ''
  MATH_RE.lastIndex = 0

  let match: RegExpExecArray | null
  let lastIndex = 0
  let changed = false
  const fragment = doc.createDocumentFragment()

  while ((match = MATH_RE.exec(original))) {
    const [raw, display, inline] = match
    const isDisplay = display !== undefined
    const rendered = renderMath(isDisplay ? display : inline, isDisplay)

    if (!rendered) continue

    fragment.append(doc.createTextNode(original.slice(lastIndex, match.index)))
    appendHtml(fragment, doc, rendered)
    lastIndex = match.index + raw.length
    changed = true
  }

  if (!changed) return

  fragment.append(doc.createTextNode(original.slice(lastIndex)))
  textNode.replaceWith(fragment)
}

/**
 * Renders admin-authored HTML with KaTeX math.
 *
 * This intentionally does not sanitize: HtmlBlock content is restricted to
 * trusted admins at authoring time. See `.kody/context/admin-html-content.md`.
 */
export function renderAdminHtmlWithMath(html: string): string {
  if (!html?.trim()) return ''

  const preprocessed = preprocessHtmlMath(html)
  const doc = new DOMParser().parseFromString(preprocessed, 'text/html')
  const walker = doc.createTreeWalker(doc.body, TEXT_NODE)
  const textNodes: Text[] = []

  let node = walker.nextNode()
  while (node) {
    textNodes.push(node as Text)
    node = walker.nextNode()
  }

  for (const textNode of textNodes) {
    const parent = textNode.parentElement
    if (!parent || parent.closest(SKIP_SELECTOR)) continue
    renderMathInTextNode(textNode, doc)
  }

  return doc.body.innerHTML
}

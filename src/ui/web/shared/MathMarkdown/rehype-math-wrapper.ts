/**
 * @fileType utility
 * @domain ui
 * @pattern rtl-isolation
 * @ai-summary Rehype plugin that wraps KaTeX output with dir="ltr" and classifies expressions as short (inline highlight) or long (visual block).
 */

import type { Element, Root, Text } from 'hast'
import { visit } from 'unist-util-visit'

/**
 * Rehype plugin that wraps KaTeX output with RTL isolation and a length class.
 *
 * WHY: In RTL pages (Hebrew) math needs `dir="ltr"` so digits/operators don't
 * flip. We also want short atoms ("AB", "x", "\pi") to read inline as part of
 * the sentence and longer equations to visually break onto their own line.
 *
 * HOW: After rehype-katex converts $...$ into KaTeX HTML, this plugin walks
 * the AST and wraps each top-level KaTeX element:
 * - Inline math (`.katex`)        -> <span dir="ltr" class="... math-short|math-long">
 * - Block  math (`.katex-display`) -> <div  dir="ltr" class="... math-long">
 *
 * NOTE: Inline math is ALWAYS wrapped in a <span>, even when we want to promote
 * it visually onto its own line, because remark-math places `$...$` inside a
 * `<p>` — putting a `<div>` there triggers HTML auto-close and causes React
 * hydration mismatches. The `.math-long` class opts into `display:block` via
 * CSS instead.
 *
 * "Short" means the TeX source normalises to ≤3 characters and contains no
 * equation-like operators (`= + / ^ _ < >`). A single macro like `\pi` or
 * `\alpha` counts as one normalised character.
 */
export function rehypeMathWrapper() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || typeof index !== 'number') return

      const className = getClassName(node)

      if (isAlreadyWrapped(className)) return

      if (parent.type === 'element') {
        const parentClassName = getClassName(parent as Element)
        if (isAlreadyWrapped(parentClassName)) return
        if (parentClassName.includes('katex')) return
      }

      const isBlockMath = className.includes('katex-display')
      const isInlineMath = !isBlockMath && className.includes('katex') && node.tagName === 'span'

      if (!isBlockMath && !isInlineMath) return

      if (isBlockMath) {
        parent.children[index] = {
          type: 'element',
          tagName: 'div',
          properties: {
            dir: 'ltr',
            className: ['isolate', 'block', 'text-center', 'mt-3', 'mb-3', 'math-long'],
          },
          children: [node],
        }
        return
      }

      // Inline math: always a <span> so we stay valid inside a <p>.
      // The math-short / math-long class drives the visual treatment in CSS.
      const source = extractLatexSource(node)
      const lengthClass = classifyShort(source) ? 'math-short' : 'math-long'

      parent.children[index] = {
        type: 'element',
        tagName: 'span',
        properties: {
          dir: 'ltr',
          className: ['isolate', 'inline-block', 'align-middle', lengthClass],
        },
        children: [node],
      }
    })
  }
}

function getClassName(node: Element): string {
  return Array.isArray(node.properties?.className)
    ? node.properties.className.join(' ')
    : String(node.properties?.className || '')
}

function isAlreadyWrapped(className: string): boolean {
  return (
    className.includes('isolate') &&
    (className.includes('inline-block') || className.includes('block'))
  )
}

/**
 * Pull the original TeX source out of the KaTeX <annotation> element.
 * KaTeX embeds it as: .katex > .katex-mathml > math > semantics > annotation.
 */
function extractLatexSource(root: Element): string {
  let source = ''
  visit(root, 'element', (child: Element) => {
    if (child.tagName !== 'annotation') return
    const first = child.children[0]
    if (first && first.type === 'text') {
      source = (first as Text).value
      return false
    }
  })
  return source.trim()
}

/**
 * Short = a bare letter / pair / single macro like "x", "AB", "\pi", "\alpha".
 * We collapse each `\command` sequence to a single placeholder character before
 * measuring length so `\alpha` counts as 1, not 6.
 */
function classifyShort(source: string): boolean {
  if (source.length === 0) return false
  const normalised = source.replace(/\\[a-zA-Z]+/g, 'x')
  if (normalised.length > 3) return false
  if (/[=+/^_<>]/.test(normalised)) return false
  return true
}

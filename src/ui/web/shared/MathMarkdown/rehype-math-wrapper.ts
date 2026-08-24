/**
 * @fileType utility
 * @domain ui
 * @pattern rtl-isolation
 * @ai-summary Rehype plugin that wraps KaTeX output with dir="ltr" and classifies expressions as short (inline highlight) or long (block).
 */

import type { Element, Root, Text } from 'hast'
import { visit } from 'unist-util-visit'

/**
 * Rehype plugin to wrap KaTeX output with RTL isolation and length classification.
 *
 * WHY: In RTL pages (like Hebrew), math expressions render incorrectly
 * because the browser applies right-to-left text direction to them.
 * We also want to visually differentiate short atoms ("AB", "x") from
 * full equations so the reader can skim the message.
 *
 * HOW: After rehype-katex converts $...$ into KaTeX HTML, this plugin
 * walks the HTML tree and wraps each top-level KaTeX element:
 * - Short inline math  -> <span dir="ltr" class="... math-short">   (wine-red, inline)
 * - Long / block math  -> <div  dir="ltr" class="... math-long">    (block, tinted background)
 *
 * "Short" means the TeX source (from the KaTeX <annotation> node) is
 * ≤3 characters and contains no equation-like operators (= + / ^ _ < >).
 * Long inline math is promoted to a block so it lands on its own line.
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

      const source = extractLatexSource(node)
      const isShort = isBlockMath ? false : classifyShort(source)

      if (isShort) {
        const wrapper: Element = {
          type: 'element',
          tagName: 'span',
          properties: {
            dir: 'ltr',
            className: ['isolate', 'inline-block', 'align-middle', 'math-short'],
          },
          children: [node],
        }
        if (parent.type === 'element' || parent.type === 'root') {
          parent.children[index] = wrapper
        }
        return
      }

      // Long or explicitly-block math: always land on its own line.
      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: {
          dir: 'ltr',
          className: ['isolate', 'block', 'text-center', 'mt-3', 'mb-3', 'math-long'],
        },
        children: [node],
      }
      if (parent.type === 'element' || parent.type === 'root') {
        parent.children[index] = wrapper
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
 * Short = a bare letter / pair / greek symbol like "x", "AB", "\pi".
 * Anything containing an equality/operator or longer than 3 source
 * characters is treated as a full expression and gets block styling.
 */
function classifyShort(source: string): boolean {
  if (source.length === 0 || source.length > 3) return false
  if (/[=+/^_<>]/.test(source)) return false
  return true
}

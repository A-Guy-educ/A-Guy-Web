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

      const source = extractLatexSource(node)

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
      // Promote to the bigger `math-long` size (own row + highlight bg) when
      // the source is either a function definition OR contains vertically-
      // stacked structure (fractions, binomials, aligned environments) that
      // reads cramped at inline height. Simple inline equations like
      // `$2x+3=5$` still stay at reading size via `math-short`.
      const lengthClass = shouldPromoteInlineMath(source) ? 'math-long' : 'math-short'

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
 * Decide whether inline math (`$...$`) should render in the bigger
 * `math-long` style (own row + highlighted background) rather than inline
 * reading-size `math-short`.
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
 * Mirrors shouldPromoteInlineMath in renderAdminHtmlWithMath.ts — keep them in sync.
 */
function shouldPromoteInlineMath(source: string): boolean {
  const value = source.trim()
  if (value.length === 0) return false
  if (/^[A-Za-z]+\s*\([A-Za-z0-9, ]*\)\s*=/.test(value)) return true
  return /\\(?:d|t)?frac\b|\\binom\b|\\begin\{/.test(value)
}

/**
 * @fileType utility
 * @domain ui
 * @pattern remark-plugin
 * @ai-summary Prepends `\displaystyle` to inline math containing fractions so KaTeX uses full
 * display-style spacing — otherwise numerator/denominator stack tight in textstyle and overlap
 * when the fraction appears next to superscripts (e.g. e^{\frac{1}{x}}).
 */

import { visit } from 'unist-util-visit'

interface Node {
  type: string
}

interface MathNode extends Node {
  type: 'inlineMath' | 'math'
  value?: string
}

interface Root extends Node {
  type: 'root'
}

/**
 * Remark plugin that walks `inlineMath` and `math` nodes created by remark-math
 * and prepends `\displaystyle ` to any whose LaTeX source contains a fraction
 * macro (`\frac`, `\dfrac`, `\tfrac`, `\binom`, `\dbinom`, `\tbinom`).
 *
 * WHY: KaTeX renders inline math in "textstyle" by default, which uses a tight
 * fraction layout — numerator and denominator shrink and the vertical gap
 * collapses, making expressions like `\frac{10}{e^x}` or `e^{\frac{1}{x}}`
 * illegible against the surrounding line. `\displaystyle` forces KaTeX to use
 * the fuller block-math layout for that one expression while keeping it inline.
 *
 * We only inject it when a fraction is present — plain `x^2` or `a_i` look
 * fine in textstyle and would waste vertical space in displaystyle.
 */
export function remarkMathDisplayStyle() {
  return (tree: Root) => {
    visit(tree, ['inlineMath', 'math'], (node: Node) => {
      const mathNode = node as unknown as MathNode
      if (typeof mathNode.value !== 'string') return
      if (!hasFractionMacro(mathNode.value)) return
      if (mathNode.value.includes('\\displaystyle')) return
      mathNode.value = `\\displaystyle ${mathNode.value}`
    })
  }
}

function hasFractionMacro(source: string): boolean {
  return /\\(?:d|t)?frac\b|\\(?:d|t)?binom\b/.test(source)
}

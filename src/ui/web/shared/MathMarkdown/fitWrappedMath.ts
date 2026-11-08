/**
 * @fileType utility
 * @domain ui
 * @pattern dom-measurement
 * @ai-summary Marks inline KaTeX that wraps onto a second line so CSS can shrink it, then lets its row move it to a new line if it still wraps.
 */

const MATH_SELECTOR = '.math-short, .math-long'
const FIT_ATTRIBUTE = 'data-math-fit'
const OVERLAP_TOLERANCE_PX = 1

export function containsMath(container: Element): boolean {
  return container.querySelector(MATH_SELECTOR) !== null
}

/**
 * KaTeX can only break a line between its top-level `.base` boxes, and math is
 * always laid out left to right. A base that starts before the previous one
 * ends must therefore be on a later line.
 */
function isWrapped(math: Element): boolean {
  const bases = Array.from(math.querySelectorAll('.katex-html > .base'), (base) =>
    base.getBoundingClientRect(),
  )
  return bases.some(
    (base, index) => index > 0 && base.left < bases[index - 1].right - OVERLAP_TOLERANCE_PX,
  )
}

/**
 * Applies the wrap rule to every inline expression in `container`: one that
 * wraps is marked `shrink` (75% via globals.css), and one that still wraps at
 * that size is marked `newline`, which rows beside a badge use to move the
 * expression onto its own line.
 *
 * Clears earlier marks first, so it is safe to call again after a resize.
 */
export function fitWrappedMath(container: Element): void {
  const expressions = Array.from(container.querySelectorAll(MATH_SELECTOR))
  expressions.forEach((math) => math.removeAttribute(FIT_ATTRIBUTE))

  const wrapped = expressions.filter(isWrapped)
  wrapped.forEach((math) => math.setAttribute(FIT_ATTRIBUTE, 'shrink'))

  const stillWrapped = wrapped.filter(isWrapped)
  stillWrapped.forEach((math) => math.setAttribute(FIT_ATTRIBUTE, 'newline'))
}

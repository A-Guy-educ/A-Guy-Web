/**
 * For a flex row that puts a badge or icon beside MathMarkdown content. When
 * math still wraps at 75% (`data-math-fit="newline"`), the content takes its
 * own row below the badge.
 */
export const MATH_NEW_ROW_CONTAINER = 'has-[[data-math-fit=newline]]:flex-wrap'
export const MATH_NEW_ROW_CONTENT =
  'has-[[data-math-fit=newline]]:order-last has-[[data-math-fit=newline]]:basis-full'

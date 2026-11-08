// @vitest-environment jsdom
/**
 * Unit tests for remark-color-syntax plugin
 */

import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'
import React from 'react'

/**
 * Helper function to render markdown with the color syntax plugin
 * We'll wire this up after updating MathMarkdown to accept the plugin
 */
function renderHighlightMarkdown(content: string) {
  return render(<MathMarkdown content={content} />)
}

describe('remarkColorSyntax - Basic Parsing', () => {
  it('should parse ::text-highlight-1{text} and render with aguy-text-highlight-1 class', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-1{important text}')
    const redSpan = container.querySelector('.aguy-text-highlight-1')
    expect(redSpan).not.toBeNull()
    expect(redSpan?.textContent).toBe('important text')
  })

  it('should parse ::text-highlight-2{text} and render with aguy-text-highlight-2 class', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-2{warning text}')
    const highlight2Span = container.querySelector('.aguy-text-highlight-2')
    expect(highlight2Span).not.toBeNull()
    expect(highlight2Span?.textContent).toBe('warning text')
  })

  it('should parse ::text-highlight-3{text} and render with aguy-text-highlight-3 class', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-3{highlighted text}')
    const highlight3Span = container.querySelector('.aguy-text-highlight-3')
    expect(highlight3Span).not.toBeNull()
    expect(highlight3Span?.textContent).toBe('highlighted text')
  })

  it('should parse ::text-highlight-4{text} and render with aguy-text-highlight-4 class', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-4{success message}')
    const greenSpan = container.querySelector('.aguy-text-highlight-4')
    expect(greenSpan).not.toBeNull()
    expect(greenSpan?.textContent).toBe('success message')
  })

  it('should parse ::text-highlight-5{text} and render with aguy-text-highlight-5 class', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-5{information}')
    const highlight5Span = container.querySelector('.aguy-text-highlight-5')
    expect(highlight5Span).not.toBeNull()
    expect(highlight5Span?.textContent).toBe('information')
  })

  it('should parse ::text-highlight-6{text} and render with aguy-text-highlight-6 class', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-6{special note}')
    const highlight6Span = container.querySelector('.aguy-text-highlight-6')
    expect(highlight6Span).not.toBeNull()
    expect(highlight6Span?.textContent).toBe('special note')
  })

  it('should parse ::text-highlight-7{text} and render with aguy-text-highlight-7 class', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-7{emphasis}')
    const highlight7Span = container.querySelector('.aguy-text-highlight-7')
    expect(highlight7Span).not.toBeNull()
    expect(highlight7Span?.textContent).toBe('emphasis')
  })

  it('should parse ::text-highlight-8{text} and render with aguy-text-highlight-8 class', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-8{muted text}')
    const highlight8Span = container.querySelector('.aguy-text-highlight-8')
    expect(highlight8Span).not.toBeNull()
    expect(highlight8Span?.textContent).toBe('muted text')
  })
})

describe('remarkColorSyntax - Named Color Tokens', () => {
  const namedColors = [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'pink',
    'gray',
    'black',
  ] as const

  it.each(namedColors)('should parse ::text-%s{text} and render matching aguy class', (color) => {
    const { container } = renderHighlightMarkdown(`::text-${color}{sample text}`)
    const span = container.querySelector(`.aguy-text-${color}`)
    expect(span).not.toBeNull()
    expect(span?.textContent).toBe('sample text')
  })

  it('should handle a mixed paragraph with a named color and a numbered highlight', () => {
    const { container } = renderHighlightMarkdown(
      'Start ::text-green{ok} middle ::text-highlight-1{oops} end',
    )
    expect(container.querySelector('.aguy-text-green')?.textContent).toBe('ok')
    expect(container.querySelector('.aguy-text-highlight-1')?.textContent).toBe('oops')
  })
})

describe('remarkColorSyntax - Darker Color Tokens', () => {
  const darkColors = [
    'dark-red',
    'dark-orange',
    'dark-yellow',
    'dark-green',
    'dark-blue',
    'dark-purple',
    'dark-pink',
    'dark-gray',
    'wine-red',
  ] as const

  it.each(darkColors)('should parse ::text-%s{text} and render matching aguy class', (color) => {
    const { container } = renderHighlightMarkdown(`::text-${color}{sample text}`)
    const span = container.querySelector(`.aguy-text-${color}`)
    expect(span).not.toBeNull()
    expect(span?.textContent).toBe('sample text')
  })

  it('should render mixed dark + named + numbered tokens in one paragraph', () => {
    const { container } = renderHighlightMarkdown(
      'start ::text-wine-red{a} mid ::text-dark-orange{b} end ::text-blue{c}',
    )
    expect(container.querySelector('.aguy-text-wine-red')?.textContent).toBe('a')
    expect(container.querySelector('.aguy-text-dark-orange')?.textContent).toBe('b')
    expect(container.querySelector('.aguy-text-blue')?.textContent).toBe('c')
  })
})

describe('remarkColorSyntax - Size Tokens', () => {
  const sizes = ['xs', 'small', 'medium', 'large', 'xlarge', 'xxlarge'] as const

  it.each(sizes)('should parse ::text-size-%s{text} and render matching aguy class', (size) => {
    const { container } = renderHighlightMarkdown(`::text-size-${size}{sized text}`)
    const span = container.querySelector(`.aguy-text-size-${size}`)
    expect(span).not.toBeNull()
    expect(span?.textContent).toBe('sized text')
  })

  it('should handle size and color tokens together in one paragraph', () => {
    const { container } = renderHighlightMarkdown(
      'Hello ::text-size-small{tiny} and ::text-size-xlarge{huge} and ::text-green{ok}',
    )
    expect(container.querySelector('.aguy-text-size-small')?.textContent).toBe('tiny')
    expect(container.querySelector('.aguy-text-size-xlarge')?.textContent).toBe('huge')
    expect(container.querySelector('.aguy-text-green')?.textContent).toBe('ok')
  })

  it('should render the reported Hebrew paragraph correctly', () => {
    // Regression: the tokens below used to leak through as literal text
    // because the plugin only whitelisted text-highlight-1..8.
    const content =
      'ילדי::text-size-small{ם יקרי}ם, דמיינו שאתם רוצים לחלוק עוגה עם חברים. איך ::text-size-xlarge{תדעו איזה חלק מהעוגה כל אחד מקבל}? בדיוק בשביל זה יש לנו שברים. בואו נתרגל לזהות ולכתוב שברים לפי::text-green{ ציורים.}'
    const { container } = renderHighlightMarkdown(content)
    expect(container.querySelector('.aguy-text-size-small')?.textContent).toBe('ם יקרי')
    expect(container.querySelector('.aguy-text-size-xlarge')?.textContent).toBe(
      'תדעו איזה חלק מהעוגה כל אחד מקבל',
    )
    expect(container.querySelector('.aguy-text-green')?.textContent).toBe(' ציורים.')
    expect(container.textContent).not.toContain('::text-')
  })
})

describe('remarkColorSyntax - Cross-Node Behavior (Now Transforms)', () => {
  // Historical note: these cases used to fall through as literal text because
  // markdown parsing (bold/italic/etc.) split the token across sibling nodes.
  // The plugin now scans across siblings and recurses into inline formatting.

  it('transforms a token whose content is entirely bolded (child of <strong>)', () => {
    const { container } = renderHighlightMarkdown('**::text-highlight-1{bold text}**')
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    const span = strong?.querySelector('.aguy-text-highlight-1')
    expect(span?.textContent).toBe('bold text')
  })

  it('transforms a token whose content spans an italic sibling', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-5{outer *inner* tail}')
    const span = container.querySelector('.aguy-text-highlight-5')
    expect(span).not.toBeNull()
    expect(span?.textContent).toBe('outer inner tail')
    expect(span?.querySelector('em')?.textContent).toBe('inner')
    expect(container.textContent).not.toContain('::text-highlight-5{')
  })

  it('transforms a token whose content wraps a link', () => {
    const { container } = renderHighlightMarkdown(
      '::text-highlight-5{go to [click here](https://example.com) now}',
    )
    const span = container.querySelector('.aguy-text-highlight-5')
    expect(span).not.toBeNull()
    const link = span?.querySelector('a')
    expect(link?.getAttribute('href')).toBe('https://example.com')
    expect(container.textContent).not.toContain('::text-highlight-5{')
  })

  it('leaves inline code inside a token as <code> but still wraps the span', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-1{run `npm i` first}')
    const span = container.querySelector('.aguy-text-highlight-1')
    expect(span).not.toBeNull()
    expect(span?.querySelector('code')?.textContent).toBe('npm i')
    expect(container.textContent).not.toContain('::text-highlight-1{')
  })

  it('handles the reported paragraph where bold/italic straddle the token braces', () => {
    // Real-world admin content: italic and bold happened to run through the
    // middle of two color tokens (::text-blue and ::text-dark-orange).
    const content =
      'אתר זה נבנה בהתא*ם ל1תקנות ש*::text-blue{*וויון זכ*ויות לאנשי}ם עם מוגבלות (ה**תאמות נגי::text-dark-orange{שות1 לשירות), תשע}"ג-2013**'
    const { container } = renderHighlightMarkdown(content)
    const blue = container.querySelector('.aguy-text-blue')
    const darkOrange = container.querySelector('.aguy-text-dark-orange')
    expect(blue).not.toBeNull()
    expect(darkOrange).not.toBeNull()
    expect(blue?.textContent).toContain('ויות לאנשי')
    expect(darkOrange?.textContent).toContain('שות1 לשירות')
    expect(container.textContent).not.toContain('::text-blue{')
    expect(container.textContent).not.toContain('::text-dark-orange{')
  })
})

describe('remarkColorSyntax - Unknown Color Fallback', () => {
  it('should render unknown color as literal text', () => {
    const { container } = renderHighlightMarkdown('::violet{text}')
    // Should not have any color class
    expect(container.querySelector('.aguy-color-violet')).toBeNull()
    // Should render as literal text
    expect(container.textContent).toContain('::violet{text}')
  })

  it('should render ::brown{} as literal text', () => {
    const { container } = renderHighlightMarkdown('::brown{warning}')
    expect(container.querySelector('.aguy-color-brown')).toBeNull()
    expect(container.textContent).toContain('::brown{warning}')
  })

  it('should render ::white{} as literal text', () => {
    const { container } = renderHighlightMarkdown('::white{alert}')
    expect(container.querySelector('.aguy-color-white')).toBeNull()
    expect(container.textContent).toContain('::white{alert}')
  })
})

describe('remarkColorSyntax - Multiple Tokens', () => {
  it('should handle multiple color tokens in one paragraph', () => {
    const { container } = renderHighlightMarkdown(
      'This is ::text-highlight-1{red} and ::text-highlight-5{blue} and ::text-highlight-4{green}',
    )
    expect(container.querySelector('.aguy-text-highlight-1')).not.toBeNull()
    expect(container.querySelector('.aguy-text-highlight-5')).not.toBeNull()
    expect(container.querySelector('.aguy-text-highlight-4')).not.toBeNull()
  })

  it('should handle adjacent color tokens', () => {
    const { container } = renderHighlightMarkdown(
      '::text-highlight-1{first}::text-highlight-5{second}',
    )
    expect(container.querySelector('.aguy-text-highlight-1')).not.toBeNull()
    expect(container.querySelector('.aguy-text-highlight-5')).not.toBeNull()
  })

  it('should handle color tokens with text in between', () => {
    const { container } = renderHighlightMarkdown(
      'Start ::text-highlight-1{important} middle ::text-highlight-5{info} end',
    )
    expect(container.textContent).toContain('Start')
    expect(container.querySelector('.aguy-text-highlight-1')).not.toBeNull()
    expect(container.textContent).toContain('middle')
    expect(container.querySelector('.aguy-text-highlight-5')).not.toBeNull()
    expect(container.textContent).toContain('end')
  })
})

describe('remarkColorSyntax - Unmatched Braces', () => {
  it('should handle unmatched opening brace', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-1{text without closing')
    // Should render as literal text since brace is unmatched
    expect(container.textContent).toContain('::text-highlight-1{text without closing')
  })

  it('should keep balanced literal braces inside the token', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-1{outer {inner} text}')
    const redSpan = container.querySelector('.aguy-text-highlight-1')
    expect(redSpan?.textContent).toBe('outer {inner} text')
    expect(container.textContent).toBe('outer {inner} text')
  })

  it('should handle empty color syntax', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-1{}')
    expect(container.querySelector('.aguy-text-highlight-1')).not.toBeNull()
  })
})

describe('remarkColorSyntax - Handler Whitelist Enforcement', () => {
  it('should only generate spans for whitelisted colors', () => {
    const { container } = renderHighlightMarkdown(
      '::text-highlight-1{red} ::text-highlight-5{blue} ::text-highlight-4{green}',
    )

    // Count the number of aguy-color spans
    const redSpans = container.querySelectorAll('.aguy-text-highlight-1')
    const highlight5Spans = container.querySelectorAll('.aguy-text-highlight-5')
    const greenSpans = container.querySelectorAll('.aguy-text-highlight-4')

    expect(redSpans.length).toBe(1)
    expect(highlight5Spans.length).toBe(1)
    expect(greenSpans.length).toBe(1)
  })

  it('should not generate inline styles', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-1{text}')
    const redSpan = container.querySelector('.aguy-text-highlight-1')
    // Should NOT contain style attribute
    expect(redSpan?.getAttribute('style')).toBeNull()
  })

  it('should only use class attribute for styling', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-5{text}')
    const highlight5Span = container.querySelector('.aguy-text-highlight-5')
    // Should only have class attribute, not style or data-color
    expect(highlight5Span).not.toBeNull()
    expect(highlight5Span?.getAttribute('style')).toBeNull()
    expect(highlight5Span?.getAttribute('data-color')).toBeNull()
  })
})

describe('remarkColorSyntax - Edge Cases', () => {
  it('should handle empty string', () => {
    const { container } = renderHighlightMarkdown('')
    expect(container.querySelector('.aguy-text-highlight-1')).toBeNull()
  })

  it('should handle text with no color syntax', () => {
    const { container } = renderHighlightMarkdown('Just plain text')
    expect(container.textContent).toContain('Just plain text')
    expect(container.querySelector('[class*="aguy-color"]')).toBeNull()
  })

  it('should handle color syntax at start of text', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-1{start} middle end')
    expect(container.querySelector('.aguy-text-highlight-1')).not.toBeNull()
  })

  it('should handle color syntax at end of text', () => {
    const { container } = renderHighlightMarkdown('start middle ::text-highlight-4{end}')
    expect(container.querySelector('.aguy-text-highlight-4')).not.toBeNull()
  })

  it('should handle multiple paragraphs with color syntax', () => {
    const { container } = renderHighlightMarkdown(
      '::text-highlight-1{First paragraph}\n\n::text-highlight-5{Second paragraph}',
    )
    expect(container.querySelector('.aguy-text-highlight-1')).not.toBeNull()
    expect(container.querySelector('.aguy-text-highlight-5')).not.toBeNull()
  })
})

describe('remarkColorSyntax - Marker Removal', () => {
  it('should not render opening marker :: in output', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-1{hello}')
    // Should not contain the :: marker
    expect(container.textContent).not.toContain('::red')
    expect(container.textContent).not.toContain('::')
    expect(container.textContent).toContain('hello')
  })

  it('should not render opening brace { in output', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-5{world}')
    const highlight5Span = container.querySelector('.aguy-text-highlight-5')
    expect(highlight5Span?.textContent).toBe('world')
    // The visible text should not contain the opening brace
    expect(container.textContent).not.toContain('::text-highlight-5{')
  })

  it('should not render closing brace } for color syntax', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-4{test}')
    const greenSpan = container.querySelector('.aguy-text-highlight-4')
    expect(greenSpan?.textContent).toBe('test')
    // Should not have trailing brace
    expect(greenSpan?.textContent).not.toContain('}')
  })

  it('should close on the balanced brace when content has braces', () => {
    const { container } = renderHighlightMarkdown('::text-highlight-1{code {x} here} after')
    const redSpan = container.querySelector('.aguy-text-highlight-1')
    expect(redSpan?.textContent).toBe('code {x} here')
    expect(container.textContent).toContain(' after')
  })
})

describe('remarkColorSyntax - Admin tokens', () => {
  it('renders text-size-normal, including the Hebrew content that exposed the bug', () => {
    const { container } = renderHighlightMarkdown('::text-size-normal{בכיתה יש }20 תלמידים')
    expect(container.querySelector('.aguy-text-size-normal')?.textContent).toBe('בכיתה יש ')
    expect(container.textContent).not.toContain('::text-size-normal')
  })

  it('renders text-align-right as a div outside any paragraph', () => {
    const { container } = renderHighlightMarkdown('::text-align-right{שורה ימנית}')
    const line = container.querySelector('.aguy-text-align-right')
    expect(line?.tagName).toBe('DIV')
    expect(line?.textContent).toBe('שורה ימנית')
    expect(container.querySelector('p')).toBeNull()
  })

  it('gives each align line its own div when lines share a markdown paragraph', () => {
    const { container } = renderHighlightMarkdown(
      'לפני\n::text-align-right{ראשונה}\n::text-align-right{שנייה}\nאחרי',
    )
    const lines = container.querySelectorAll('div.aguy-text-align-right')
    expect([...lines].map((line) => line.textContent)).toEqual(['ראשונה', 'שנייה'])
    expect(container.querySelector('p .aguy-text-align-right')).toBeNull()
    expect([...container.querySelectorAll('p')].map((p) => p.textContent?.trim())).toEqual([
      'לפני',
      'אחרי',
    ])
  })

  it('keeps an empty align line as an element', () => {
    const { container } = renderHighlightMarkdown('::text-align-right{}')
    expect(container.querySelector('div.aguy-text-align-right')).not.toBeNull()
    expect(container.textContent).not.toContain('::')
  })

  it('does not emit a div inside a paragraph when align is nested in bold', () => {
    const { container } = renderHighlightMarkdown('**::text-align-right{דגש}**')
    expect(container.querySelector('strong span.aguy-text-align-right')?.textContent).toBe('דגש')
    expect(container.querySelector('p div')).toBeNull()
  })
})

describe('remarkColorSyntax - Nested tokens', () => {
  it('nests color inside size', () => {
    const { container } = renderHighlightMarkdown('::text-size-large{::text-blue{x}}')
    const inner = container.querySelector('.aguy-text-size-large > .aguy-text-blue')
    expect(inner?.textContent).toBe('x')
    expect(container.textContent).toBe('x')
  })

  it('nests size inside color', () => {
    const { container } = renderHighlightMarkdown('::text-blue{a ::text-size-large{x} b}')
    expect(container.querySelector('.aguy-text-blue > .aguy-text-size-large')?.textContent).toBe(
      'x',
    )
    expect(container.querySelector('.aguy-text-blue')?.textContent).toBe('a x b')
  })

  it('lets align wrap size around color', () => {
    const { container } = renderHighlightMarkdown(
      '::text-align-right{::text-size-large{::text-blue{x}}}',
    )
    expect(
      container.querySelector('div.aguy-text-align-right .aguy-text-size-large .aguy-text-blue')
        ?.textContent,
    ).toBe('x')
    expect(container.textContent).toBe('x')
  })

  it('handles sibling tokens after a nested one', () => {
    const { container } = renderHighlightMarkdown(
      '::text-size-large{::text-blue{a}} ::text-green{b}',
    )
    expect(container.querySelector('.aguy-text-green')?.textContent).toBe('b')
    expect(container.textContent).toBe('a b')
  })

  it('keeps bold inside nested tokens', () => {
    const { container } = renderHighlightMarkdown('::text-size-large{::text-blue{a **b** c}}')
    expect(container.querySelector('.aguy-text-blue strong')?.textContent).toBe('b')
    expect(container.textContent).toBe('a b c')
  })

  it('transforms a nested token inside bold', () => {
    const { container } = renderHighlightMarkdown('**::text-size-large{::text-blue{x}}**')
    expect(container.querySelector('strong .aguy-text-size-large .aguy-text-blue')).not.toBeNull()
  })
})

describe('remarkColorSyntax - Math inside tokens', () => {
  it('does not count math braces when matching', () => {
    const { container } = renderHighlightMarkdown('::text-blue{$\\frac{1}{2}$} אחרי')
    const span = container.querySelector('.aguy-text-blue')
    expect(span?.querySelector('.katex')).not.toBeNull()
    expect(container.textContent).not.toContain('::text-blue')
    // No stray brace after the tag (KaTeX's own annotation holds the LaTeX source).
    expect(span?.nextSibling?.textContent).toBe(' אחרי')
  })

  it('keeps math inside nested tokens', () => {
    const { container } = renderHighlightMarkdown(
      '::text-size-large{::text-blue{$\\frac{1}{2}$} טקסט}',
    )
    expect(container.querySelector('.aguy-text-size-large .aguy-text-blue .katex')).not.toBeNull()
    expect(container.textContent).not.toContain('::')
  })

  it('keeps math left-to-right inside an align line', () => {
    const { container } = renderHighlightMarkdown('::text-align-right{שבר $\\frac{1}{2}$}')
    const line = container.querySelector('div.aguy-text-align-right')
    expect(line?.querySelector('[dir="ltr"] .katex')).not.toBeNull()
  })
})

describe('remarkColorSyntax - Literal fallbacks', () => {
  it('keeps an unknown token literal and still renders a later token', () => {
    const { container } = renderHighlightMarkdown('::text-violet{a} ::text-blue{b}')
    expect(container.querySelector('.aguy-text-violet')).toBeNull()
    expect(container.textContent).toContain('::text-violet{a}')
    expect(container.querySelector('.aguy-text-blue')?.textContent).toBe('b')
  })

  it('keeps an unknown token nested inside a known one literal', () => {
    const { container } = renderHighlightMarkdown('::text-blue{::text-violet{a}}')
    expect(container.querySelector('.aguy-text-blue')?.textContent).toBe('::text-violet{a}')
    expect(container.querySelector('.aguy-text-violet')).toBeNull()
  })

  it('keeps an unclosed outer token literal and renders its closed inner token', () => {
    const { container } = renderHighlightMarkdown('::text-size-large{::text-blue{x}')
    expect(container.querySelector('.aguy-text-size-large')).toBeNull()
    expect(container.querySelector('.aguy-text-blue')?.textContent).toBe('x')
    expect(container.textContent).toContain('::text-size-large{')
  })

  it('keeps an unclosed align tag literal', () => {
    const { container } = renderHighlightMarkdown('::text-align-right{line')
    expect(container.querySelector('.aguy-text-align-right')).toBeNull()
    expect(container.textContent).toContain('::text-align-right{line')
  })
})

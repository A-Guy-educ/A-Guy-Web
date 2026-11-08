// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { renderAdminHtmlWithMath, renderTextWithMath } from '@/infra/utils/renderAdminHtmlWithMath'

describe('renderAdminHtmlWithMath', () => {
  it('renders inline math inside admin HTML as KaTeX', () => {
    const result = renderAdminHtmlWithMath('<p>The equation is $x^2+4x$.</p>')

    expect(result).toContain('class="katex"')
    expect(result).toContain('dir="ltr"')
    expect(result).toContain('isolate')
    expect(result).not.toContain('$x^2+4x$')
  })

  it('renders encoded dollar delimiters from admin HTML as KaTeX', () => {
    const result = renderAdminHtmlWithMath('<p>The equation is &#36;x^2+4x&#36;.</p>')

    expect(result).toContain('class="katex"')
    expect(result).not.toContain('$x^2+4x$')
    expect(result).not.toContain('&#36;x^2+4x&#36;')
  })

  it('renders display math inside admin HTML as KaTeX display mode', () => {
    const result = renderAdminHtmlWithMath('<p>$$x^2 + y^2 = z^2$$</p>')

    expect(result).toContain('class="katex-display"')
    expect(result).toContain('dir="ltr"')
    expect(result).not.toContain('$$x^2 + y^2 = z^2$$')
  })

  it('preserves trusted admin HTML tags and style attributes', () => {
    const result = renderAdminHtmlWithMath('<section style="color:red"><h2>Title</h2></section>')

    expect(result).toContain('<section style="color:red">')
    expect(result).toContain('<h2>Title</h2>')
  })

  it('keeps dollar text that does not look like math', () => {
    const result = renderAdminHtmlWithMath('<p>The prices are $5 and $10 today.</p>')

    expect(result).toContain('$5 and $10')
    expect(result).not.toContain('class="katex"')
  })

  it('does not render math inside code blocks', () => {
    const result = renderAdminHtmlWithMath('<code>$x^2+4x$</code>')

    expect(result).toContain('$x^2+4x$')
    expect(result).not.toContain('class="katex"')
  })

  it('keeps existing bare arithmetic support from HTML preprocessing', () => {
    const result = renderAdminHtmlWithMath('<p>0.1 + 0.2</p>')

    expect(result).toContain('class="katex"')
    expect(result).not.toContain('0.1 + 0.2</p>')
  })

  it('does not require browser DOM globals', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    try {
      const result = renderAdminHtmlWithMath('<p>The equation is $x^2+4x$.</p>')

      expect(result).toContain('class="katex"')
      expect(result).not.toContain('$x^2+4x$')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('renderAdminHtmlWithMath - color-syntax tokens', () => {
  it('wraps color tokens found in text between admin HTML tags', () => {
    const result = renderAdminHtmlWithMath(
      '<p>אתר זה נבנה בהתאם לתקנות ש::text-blue{וויון זכויות לאנשי}ם עם מוגבלות</p>',
    )
    expect(result).toContain('<span class="aguy-text-blue">וויון זכויות לאנשי</span>')
    expect(result).not.toContain('::text-blue{')
  })

  it('wraps dark/wine tokens in admin HTML', () => {
    const result = renderAdminHtmlWithMath(
      '<p>נגי::text-dark-orange{שות לשירות} וגם ::text-wine-red{דגש}</p>',
    )
    expect(result).toContain('<span class="aguy-text-dark-orange">שות לשירות</span>')
    expect(result).toContain('<span class="aguy-text-wine-red">דגש</span>')
  })

  it('leaves color tokens inside <code> blocks untouched', () => {
    const result = renderAdminHtmlWithMath('<code>::text-blue{keep raw}</code>')
    expect(result).toContain('::text-blue{keep raw}')
    expect(result).not.toContain('aguy-text-blue')
  })

  it('renders both color and math within the same admin HTML paragraph', () => {
    const result = renderAdminHtmlWithMath('<p>::text-green{$x^2$} תשובה</p>')
    expect(result).toContain('<span class="aguy-text-green">')
    expect(result).toContain('class="katex"')
  })

  it('renders text-size-normal in admin HTML', () => {
    const result = renderAdminHtmlWithMath('<p>::text-size-normal{בכיתה יש }20 תלמידים</p>')
    expect(result).toContain('<span class="aguy-text-size-normal">בכיתה יש </span>')
    expect(result).not.toContain('::text-size-normal')
  })

  it('emits a div for align where the parent can hold one', () => {
    const result = renderAdminHtmlWithMath('<section>::text-align-right{שורה}</section>')
    expect(result).toContain('<div class="aguy-text-align-right">שורה</div>')
  })

  it('keeps align a span inside a paragraph so the parser cannot split it', () => {
    const result = renderAdminHtmlWithMath('<p>::text-align-right{שורה}</p>')
    expect(result).toBe('<p><span class="aguy-text-align-right">שורה</span></p>')

    const parsed = new DOMParser().parseFromString(result, 'text/html')
    expect(parsed.body.children).toHaveLength(1)
    expect(parsed.querySelector('p .aguy-text-align-right')).not.toBeNull()
  })

  it('stays a span in a paragraph even when nested under another token', () => {
    const result = renderAdminHtmlWithMath('<p>::text-blue{::text-align-right{x}}</p>')
    expect(result).toContain(
      '<span class="aguy-text-blue"><span class="aguy-text-align-right">x</span></span>',
    )
  })

  it('nests tokens in both orders', () => {
    const sizeOuter = renderAdminHtmlWithMath('<p>::text-size-large{::text-blue{x}}</p>')
    expect(sizeOuter).toBe(
      '<p><span class="aguy-text-size-large"><span class="aguy-text-blue">x</span></span></p>',
    )

    const colorOuter = renderAdminHtmlWithMath('<p>::text-blue{::text-size-large{x}}</p>')
    expect(colorOuter).toBe(
      '<p><span class="aguy-text-blue"><span class="aguy-text-size-large">x</span></span></p>',
    )
  })

  it('does not count math braces, including entity-encoded dollars', () => {
    const plain = renderAdminHtmlWithMath('<p>::text-blue{$\\frac{1}{2}$} אחרי</p>')
    expect(plain).toContain('<span class="aguy-text-blue"><span dir="ltr"')
    expect(plain).toContain('class="katex"')
    expect(plain).not.toContain('::text-blue')
    expect(plain).toMatch(/<\/span> אחרי<\/p>$/)

    const encoded = renderAdminHtmlWithMath('<p>::text-blue{&#36;\\frac{1}{2}&#36;} אחרי</p>')
    expect(encoded).toContain('<span class="aguy-text-blue"><span dir="ltr"')
    expect(encoded).toMatch(/<\/span> אחרי<\/p>$/)
  })

  it('leaves nested tokens inside <code> untouched', () => {
    const result = renderAdminHtmlWithMath('<code>::text-size-large{::text-blue{x}}</code>')
    expect(result).toBe('<code>::text-size-large{::text-blue{x}}</code>')
  })

  it('keeps unknown and unclosed tokens literal in admin HTML', () => {
    expect(renderAdminHtmlWithMath('<p>::text-violet{x}</p>')).toBe('<p>::text-violet{x}</p>')
    expect(renderAdminHtmlWithMath('<p>::text-blue{x</p>')).toBe('<p>::text-blue{x</p>')
  })
})

describe('renderTextWithMath - color-syntax tokens', () => {
  it('wraps a whitelisted color token in a matching aguy-* span', () => {
    const result = renderTextWithMath('אתר ::text-blue{שוויון זכויות} עם מוגבלות')
    expect(result).toContain('<span class="aguy-text-blue">שוויון זכויות</span>')
    expect(result).not.toContain('::text-blue{')
  })

  it('wraps darker/named tone tokens', () => {
    const result = renderTextWithMath(
      'לפני ::text-dark-orange{התאמות נגישות} אחרי ::text-wine-red{דגש} סוף',
    )
    expect(result).toContain('<span class="aguy-text-dark-orange">התאמות נגישות</span>')
    expect(result).toContain('<span class="aguy-text-wine-red">דגש</span>')
  })

  it('wraps size tokens', () => {
    const result = renderTextWithMath('a ::text-size-xlarge{big} b ::text-size-small{tiny} c')
    expect(result).toContain('<span class="aguy-text-size-xlarge">big</span>')
    expect(result).toContain('<span class="aguy-text-size-small">tiny</span>')
  })

  it('leaves unknown tokens untouched as literal text', () => {
    const result = renderTextWithMath('start ::text-violet{ignored} end')
    expect(result).toContain('::text-violet{ignored}')
    expect(result).not.toContain('aguy-text-violet')
  })

  it('does not let user-supplied token content inject markup', () => {
    // Content is HTML-escaped BEFORE the color transform, so any raw '<' inside
    // the token braces stays escaped inside the emitted span.
    const result = renderTextWithMath('::text-blue{<script>x</script>}')
    expect(result).toContain('<span class="aguy-text-blue">')
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<script>')
  })

  it('renders math inside color-wrapped content', () => {
    const result = renderTextWithMath('::text-green{$x^2$}')
    expect(result).toContain('<span class="aguy-text-green">')
    expect(result).toContain('class="katex"')
  })

  it('renders text-size-normal around Hebrew content', () => {
    expect(renderTextWithMath('::text-size-normal{בכיתה יש }')).toBe(
      '<span class="aguy-text-size-normal">בכיתה יש </span>',
    )
  })

  it('renders text-align-right as a block element', () => {
    expect(renderTextWithMath('::text-align-right{שורה}')).toBe(
      '<div class="aguy-text-align-right">שורה</div>',
    )
  })

  it('nests tokens in both orders and under align', () => {
    expect(renderTextWithMath('::text-size-large{::text-blue{x}}')).toBe(
      '<span class="aguy-text-size-large"><span class="aguy-text-blue">x</span></span>',
    )
    expect(renderTextWithMath('::text-blue{::text-size-large{x}}')).toBe(
      '<span class="aguy-text-blue"><span class="aguy-text-size-large">x</span></span>',
    )
    expect(renderTextWithMath('::text-align-right{::text-blue{x}}')).toBe(
      '<div class="aguy-text-align-right"><span class="aguy-text-blue">x</span></div>',
    )
  })

  it('handles several tokens on one line', () => {
    expect(renderTextWithMath('::text-blue{a} b ::text-size-large{::text-green{c}} d')).toBe(
      '<span class="aguy-text-blue">a</span> b <span class="aguy-text-size-large"><span class="aguy-text-green">c</span></span> d',
    )
  })

  it('does not count math braces when matching', () => {
    const result = renderTextWithMath('::text-blue{$\\frac{1}{2}$} אחרי')
    expect(result).toContain('<span class="aguy-text-blue"><span dir="ltr"')
    expect(result).toContain('class="katex"')
    expect(result).not.toContain('::text-blue')
    expect(result).toMatch(/<\/span> אחרי$/)
  })

  it('does not mistake currency dollars for math', () => {
    const result = renderTextWithMath('::text-blue{$5} ו-::text-green{$10}')
    expect(result).toContain('<span class="aguy-text-blue">$5</span>')
    expect(result).toContain('<span class="aguy-text-green">$10</span>')
  })

  it('keeps unknown tokens literal, even around known ones', () => {
    expect(renderTextWithMath('::text-violet{a}')).toBe('::text-violet{a}')
    expect(renderTextWithMath('::text-blue{::text-violet{a}}')).toBe(
      '<span class="aguy-text-blue">::text-violet{a}</span>',
    )
  })

  it('keeps an unclosed outer token literal and renders its closed inner token', () => {
    expect(renderTextWithMath('::text-blue{x')).toBe('::text-blue{x')
    expect(renderTextWithMath('::text-size-large{::text-blue{x}')).toBe(
      '::text-size-large{<span class="aguy-text-blue">x</span>',
    )
  })

  it('does not let nested or block token content inject markup', () => {
    const nested = renderTextWithMath('::text-align-right{::text-blue{<img src=x onerror=y>}}')
    expect(nested).toContain('&lt;img src=x onerror=y&gt;')
    expect(nested).not.toContain('<img')

    const hostileToken = renderTextWithMath('::x"><script>{a}')
    expect(hostileToken).not.toContain('<script>')
  })
})

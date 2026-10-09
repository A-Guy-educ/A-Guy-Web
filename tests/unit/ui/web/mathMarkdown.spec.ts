import { describe, it, expect } from 'vitest'
import { markdownToLatex, latexToMarkdown } from '@/ui/web/shared/MathInput/mathMarkdown'

describe('markdownToLatex', () => {
  it('wraps plain text in \\text{}', () => {
    expect(markdownToLatex('hello world')).toBe('\\text{hello world}')
  })

  it('leaves math between $...$ as raw LaTeX', () => {
    expect(markdownToLatex('solve $x^2 = 4$ now')).toBe('\\text{solve }x^2 = 4\\text{ now}')
  })

  it('handles a leading math segment', () => {
    expect(markdownToLatex('$a+b$ = c')).toBe('a+b\\text{ = c}')
  })

  it('escapes special TeX chars inside text runs', () => {
    expect(markdownToLatex('a{b}c')).toBe('\\text{a\\{b\\}c}')
    expect(markdownToLatex('\\path')).toBe('\\text{\\\\path}')
  })

  it('treats an unterminated $ as plain text', () => {
    expect(markdownToLatex('cost is $5')).toBe('\\text{cost is }\\text{\\$5}')
  })

  it('returns empty string for empty input', () => {
    expect(markdownToLatex('')).toBe('')
  })

  it('preserves Hebrew text verbatim', () => {
    expect(markdownToLatex('פתור $x$ עכשיו')).toBe('\\text{פתור }x\\text{ עכשיו}')
  })
})

describe('latexToMarkdown', () => {
  it('unwraps a single \\text{} run', () => {
    expect(latexToMarkdown('\\text{hello world}')).toBe('hello world')
  })

  it('converts mixed-mode LaTeX back to markdown with $...$', () => {
    expect(latexToMarkdown('\\text{solve }x^2 = 4\\text{ now}')).toBe('solve $x^2 = 4$ now')
  })

  it('collapses adjacent math atoms into one $-segment', () => {
    expect(latexToMarkdown('x+y')).toBe('$x+y$')
  })

  it('unescapes TeX escapes inside text', () => {
    expect(latexToMarkdown('\\text{a\\{b\\}c}')).toBe('a{b}c')
  })

  it('handles balanced braces inside text', () => {
    expect(latexToMarkdown('\\text{{nested}}')).toBe('{nested}')
  })

  it('returns empty string for empty input', () => {
    expect(latexToMarkdown('')).toBe('')
  })

  it('preserves Hebrew in text runs', () => {
    expect(latexToMarkdown('\\text{פתור }x\\text{ עכשיו}')).toBe('פתור $x$ עכשיו')
  })
})

describe('round-trip', () => {
  const samples = [
    'hello world',
    'solve $x^2 = 4$ now',
    '$a+b$',
    'words then $\\frac{1}{2}$ end',
    'פתור $x$ עכשיו',
  ]
  for (const md of samples) {
    it(`markdown → latex → markdown is stable for: ${md}`, () => {
      expect(latexToMarkdown(markdownToLatex(md))).toBe(md)
    })
  }
})

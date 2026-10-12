import { describe, it, expect } from 'vitest'
import { markdownToTipTap, tipTapToMarkdown } from '@/ui/web/shared/MathInput/tiptapMarkdown'

describe('markdownToTipTap', () => {
  it('wraps empty input in a single empty paragraph', () => {
    expect(markdownToTipTap('')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })

  it('converts plain text into a text node inside a paragraph', () => {
    expect(markdownToTipTap('hello world')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello world' }] }],
    })
  })

  it('converts inline $...$ math into a mathInline atomic node', () => {
    expect(markdownToTipTap('solve $x^2$ now')).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'solve ' },
            { type: 'mathInline', attrs: { latex: 'x^2' } },
            { type: 'text', text: ' now' },
          ],
        },
      ],
    })
  })

  it('handles a leading math segment', () => {
    expect(markdownToTipTap('$a+b$ = c')).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mathInline', attrs: { latex: 'a+b' } },
            { type: 'text', text: ' = c' },
          ],
        },
      ],
    })
  })

  it('treats an unterminated $ as literal text', () => {
    expect(markdownToTipTap('cost is $5')).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'cost is ' },
            { type: 'text', text: '$5' },
          ],
        },
      ],
    })
  })

  it('preserves Hebrew text verbatim', () => {
    expect(markdownToTipTap('פתור $x$ עכשיו')).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'פתור ' },
            { type: 'mathInline', attrs: { latex: 'x' } },
            { type: 'text', text: ' עכשיו' },
          ],
        },
      ],
    })
  })

  it('splits newlines into separate paragraphs', () => {
    const result = markdownToTipTap('line one\nline two')
    expect(result.content).toHaveLength(2)
    expect(result.content?.[0]?.content?.[0]?.text).toBe('line one')
    expect(result.content?.[1]?.content?.[0]?.text).toBe('line two')
  })
})

describe('tipTapToMarkdown', () => {
  it('returns empty string for an empty doc', () => {
    expect(tipTapToMarkdown({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('')
  })

  it('serializes text runs as-is', () => {
    expect(
      tipTapToMarkdown({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
      }),
    ).toBe('hello')
  })

  it('serializes mathInline nodes as $...$', () => {
    expect(
      tipTapToMarkdown({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'solve ' },
              { type: 'mathInline', attrs: { latex: 'x^2' } },
              { type: 'text', text: ' now' },
            ],
          },
        ],
      }),
    ).toBe('solve $x^2$ now')
  })

  it('skips mathInline nodes with empty latex', () => {
    expect(
      tipTapToMarkdown({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'a' },
              { type: 'mathInline', attrs: { latex: '' } },
              { type: 'text', text: 'b' },
            ],
          },
        ],
      }),
    ).toBe('ab')
  })

  it('joins multiple paragraphs with newlines', () => {
    expect(
      tipTapToMarkdown({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'line one' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'line two' }] },
        ],
      }),
    ).toBe('line one\nline two')
  })
})

describe('round-trip', () => {
  const samples = [
    '',
    'hello world',
    'solve $x^2 = 4$ now',
    '$a+b$',
    'words then $\\frac{1}{2}$ end',
    'פתור $x$ עכשיו',
    'line one\nline two',
  ]
  for (const md of samples) {
    it(`markdown → tiptap → markdown is stable for: ${JSON.stringify(md)}`, () => {
      expect(tipTapToMarkdown(markdownToTipTap(md))).toBe(md)
    })
  }
})

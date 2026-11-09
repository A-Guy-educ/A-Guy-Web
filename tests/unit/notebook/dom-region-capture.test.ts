import { describe, expect, it } from 'vitest'

import { keepFirstFontSource } from '@/ui/web/notebook/RegionCut/dom-region-capture'

describe('keepFirstFontSource', () => {
  it('keeps only the first source of a font', () => {
    const css =
      '@font-face { font-family: KaTeX_Main; src: url("data:font/woff2;base64,AA") format("woff2"), url("data:font/woff;base64,BB") format("woff"), url("data:font/ttf;base64,CC") format("truetype"); font-weight: 400; }'

    expect(keepFirstFontSource(css)).toBe(
      '@font-face { font-family: KaTeX_Main; src: url("data:font/woff2;base64,AA") format("woff2"); font-weight: 400; }',
    )
  })

  it('keeps every font in the sheet', () => {
    const css =
      '@font-face { src: url(a.woff2) format("woff2"), url(a.ttf); }\n@font-face { src: url(b.woff2) format("woff2"), url(b.ttf); }'

    expect(keepFirstFontSource(css).match(/@font-face/g)).toHaveLength(2)
    expect(keepFirstFontSource(css)).toContain('url(b.woff2)')
  })

  it('leaves a font with one source alone', () => {
    const css = '@font-face { src: url(a.woff2) format("woff2"); }'

    expect(keepFirstFontSource(css)).toBe(css)
  })
})

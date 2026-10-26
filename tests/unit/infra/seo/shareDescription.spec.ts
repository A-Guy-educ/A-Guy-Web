/**
 * @fileType unit-test
 * @domain seo
 * @pattern share-description
 * @ai-summary Locks the link-preview description rule: tagline alone when a page has no description, "tagline · description" otherwise, no duplication when the description or title already is the tagline.
 */

import { describe, expect, it } from 'vitest'
import { withShareTagline } from '@/infra/seo/shareDescription'

const TAGLINE = 'Aguy מורה פרטי AI'

describe('withShareTagline', () => {
  it('uses the tagline alone when the page has no description', () => {
    expect(withShareTagline(TAGLINE, undefined)).toBe(TAGLINE)
    expect(withShareTagline(TAGLINE, '')).toBe(TAGLINE)
    expect(withShareTagline(TAGLINE, '   ')).toBe(TAGLINE)
  })

  it('leads an existing description with the tagline', () => {
    expect(withShareTagline(TAGLINE, 'בחרו את המסלול שמתאים לכם')).toBe(
      `${TAGLINE} · בחרו את המסלול שמתאים לכם`,
    )
  })

  it('does not repeat the tagline', () => {
    const already = `${TAGLINE} · something`
    expect(withShareTagline(TAGLINE, already)).toBe(already)
  })

  it('leaves the description alone when the title already is the tagline', () => {
    expect(withShareTagline(TAGLINE, 'ממש כמו מורה פרטי', TAGLINE)).toBe('ממש כמו מורה פרטי')
  })
})

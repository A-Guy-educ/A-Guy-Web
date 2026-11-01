import { describe, expect, it } from 'vitest'

import { localMatch } from '@/server/services/answer-validation/local-match'

describe('localMatch', () => {
  it('matches exact, LaTeX and numeric forms', () => {
    expect(localMatch(' 4 ', ['4'])).toEqual({ matched: true, matchType: 'exact' })
    expect(localMatch('$\\frac{1}{2}$', ['(1)/(2)'])).toEqual({
      matched: true,
      matchType: 'latex-plain',
    })
    expect(localMatch('4.0', ['4'])).toEqual({ matched: true, matchType: 'numeric' })
  })

  describe('variable labels', () => {
    it('accepts a bare value when the accepted answer is labelled', () => {
      expect(localMatch('4', ['d=4'])).toEqual({ matched: true, matchType: 'variable-label' })
      expect(localMatch('4', ['d = 4'])).toEqual({ matched: true, matchType: 'variable-label' })
      expect(localMatch('$4$', ['$d=4$'])).toEqual({ matched: true, matchType: 'variable-label' })
    })

    it('accepts a labelled value when the accepted answer is bare', () => {
      expect(localMatch('x = 3', ['3'])).toEqual({ matched: true, matchType: 'variable-label' })
      expect(localMatch('a_1=-2.5', ['-2.5'])).toEqual({
        matched: true,
        matchType: 'variable-label',
      })
    })

    it('compares labelled values numerically', () => {
      expect(localMatch('d=4.0', ['4'])).toEqual({ matched: true, matchType: 'variable-label' })
    })

    it('rejects a different variable or a different value', () => {
      expect(localMatch('y=4', ['x=4'])).toEqual({ matched: false })
      expect(localMatch('5', ['d=4'])).toEqual({ matched: false })
      expect(localMatch('d=5', ['4'])).toEqual({ matched: false })
    })

    it('leaves multi-equals equations to the LLM', () => {
      expect(localMatch('3', ['x=y=3'])).toEqual({ matched: false })
    })
  })
})

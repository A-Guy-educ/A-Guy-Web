/**
 * @fileType test
 * @domain lesson-rendering
 * @ai-summary Verifies the sentence-splitter inserts <br/> after `.`, `!`, `?`
 * punctuation on text segments only, and leaves HTML tags (including KaTeX
 * markup) intact.
 */
import { describe, expect, it } from 'vitest'

import { splitSentencesInLessonHtml } from '@/infra/utils/splitSentencesInLessonHtml'

describe('splitSentencesInLessonHtml', () => {
  it('returns an empty string for empty input', () => {
    expect(splitSentencesInLessonHtml('')).toBe('')
  })

  it('inserts a <br/> after a period followed by whitespace', () => {
    expect(splitSentencesInLessonHtml('Sentence one. Sentence two.')).toBe(
      'Sentence one.<br/>Sentence two.',
    )
  })

  it('inserts a <br/> after a question mark followed by whitespace', () => {
    expect(splitSentencesInLessonHtml('What? Really.')).toBe('What?<br/>Really.')
  })

  it('inserts a <br/> after an exclamation mark followed by whitespace', () => {
    expect(splitSentencesInLessonHtml('Hey! Listen.')).toBe('Hey!<br/>Listen.')
  })

  it('does not split when punctuation is not followed by whitespace', () => {
    expect(splitSentencesInLessonHtml('3.14 is pi')).toBe('3.14 is pi')
  })

  it('does not touch content that lives inside HTML tags', () => {
    const html = '<span class="a. b.">x. y.</span>'
    expect(splitSentencesInLessonHtml(html)).toBe('<span class="a. b.">x.<br/>y.</span>')
  })

  it('keeps KaTeX markup intact while still splitting surrounding prose', () => {
    const html = 'Prose one. <span class="katex" data-eq="x. y">x</span> Prose two.'
    expect(splitSentencesInLessonHtml(html)).toBe(
      'Prose one.<br/><span class="katex" data-eq="x. y">x</span> Prose two.',
    )
  })

  it('splits Hebrew sentences the same way', () => {
    expect(splitSentencesInLessonHtml('זה משפט ראשון. זה משפט שני?')).toBe(
      'זה משפט ראשון.<br/>זה משפט שני?',
    )
  })
})

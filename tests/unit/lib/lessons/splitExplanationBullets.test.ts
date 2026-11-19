import { describe, expect, it } from 'vitest'

import { splitExplanationBullets } from '@/lib/lessons/splitExplanationBullets'

describe('splitExplanationBullets', () => {
  it('returns no bullets for empty input', () => {
    expect(splitExplanationBullets(undefined)).toEqual([])
    expect(splitExplanationBullets(null)).toEqual([])
    expect(splitExplanationBullets('  \n ')).toEqual([])
  })

  it('starts a new bullet on every newline', () => {
    expect(splitExplanationBullets('מספר חיובי — גדול מאפס\nמספר שלילי — קטן מאפס')).toEqual([
      'מספר חיובי — גדול מאפס',
      'מספר שלילי — קטן מאפס',
    ])
  })

  it('starts a new bullet after . ! and ?', () => {
    expect(splitExplanationBullets('ראשון. שני! שלישי? רביעי')).toEqual([
      'ראשון.',
      'שני!',
      'שלישי?',
      'רביעי',
    ])
  })

  it('does not split decimals or punctuation inside math', () => {
    expect(splitExplanationBullets('הערך הוא $3.5$ בדיוק. ואז $a. b$ נשאר יחד.')).toEqual([
      'הערך הוא $3.5$ בדיוק.',
      'ואז $a. b$ נשאר יחד.',
    ])
  })

  it('drops bullet markers the author already typed', () => {
    expect(splitExplanationBullets('- ראשון\n• שני\n1. שלישי')).toEqual(['ראשון', 'שני', 'שלישי'])
  })
})

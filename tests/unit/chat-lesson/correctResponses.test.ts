import {
  CORRECT_RESPONSE_PAIRS,
  pickCorrectReaction,
} from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/correctResponses'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('pickCorrectReaction', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the long variant when wantLong=true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { text, pairKey } = pickCorrectReaction({ wantLong: true, lastPairKey: null })
    const pair = CORRECT_RESPONSE_PAIRS.find((p) => p.key === pairKey)
    expect(pair).toBeTruthy()
    expect(text).toBe(pair!.long)
  })

  it('returns the short variant when wantLong=false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { text, pairKey } = pickCorrectReaction({ wantLong: false, lastPairKey: null })
    const pair = CORRECT_RESPONSE_PAIRS.find((p) => p.key === pairKey)
    expect(pair).toBeTruthy()
    expect(text).toBe(pair!.short)
  })

  it('excludes lastPairKey from candidates to avoid back-to-back repeats', () => {
    // 100 picks with the first pool key excluded must never choose it.
    // Picker uses the real `Math.random`, which stays unmocked in this case.
    const banned = CORRECT_RESPONSE_PAIRS[0].key
    for (let i = 0; i < 100; i++) {
      const { pairKey } = pickCorrectReaction({ wantLong: true, lastPairKey: banned })
      expect(pairKey).not.toBe(banned)
    }
  })

  it('ignores lastPairKey when it is null (fresh lesson state)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { pairKey } = pickCorrectReaction({ wantLong: true, lastPairKey: null })
    expect(CORRECT_RESPONSE_PAIRS.map((p) => p.key)).toContain(pairKey)
  })

  it('always returns a pool pair key', () => {
    const validKeys = new Set(CORRECT_RESPONSE_PAIRS.map((p) => p.key))
    for (let i = 0; i < 50; i++) {
      const { pairKey } = pickCorrectReaction({ wantLong: i % 2 === 0, lastPairKey: null })
      expect(validKeys.has(pairKey)).toBe(true)
    }
  })
})

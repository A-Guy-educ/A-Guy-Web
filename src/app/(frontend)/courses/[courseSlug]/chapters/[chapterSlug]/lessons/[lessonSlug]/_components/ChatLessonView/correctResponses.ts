/**
 * @fileType data
 * @domain lessons
 * @ai-summary Canned Hebrew reactions for a correct answer in the Chat lesson
 *             view. Replaces the earlier flat `WELL_DONE_MESSAGES` pool.
 *
 *             Each pool entry is a long/short pair sharing an opener. Picker
 *             rules (per the chatviewtodo spec):
 *               - First correct section in an exercise → long variant
 *               - Subsequent corrects in the same exercise → short variant
 *               - A pair never fires twice in a row (lesson-wide)
 *
 *             The caller owns the per-exercise "long shown" flag and the
 *             lesson-wide "last pair key" — see useLessonChatProgress.
 */

export interface CorrectResponsePair {
  key: string
  short: string
  long: string
}

export const CORRECT_RESPONSE_PAIRS: readonly CorrectResponsePair[] = [
  { key: 'esh', short: 'אש!', long: 'אש! תפסת את זה.' },
  { key: 'yafe', short: 'יפה!', long: 'יפה! עוד צעד קדימה.' },
  { key: 'nachon', short: 'נכון!', long: 'נכון! אנחנו בכיוון 🙂' },
  { key: 'yesh', short: 'יש!', long: 'יש! ממשיכים בקצב טוב.' },
  { key: 'metsuyan', short: 'מעולה!', long: 'מעולה! אפשר לחייך ולהמשיך 🙂' },
]

export interface PickCorrectReactionArgs {
  /** True ⇒ the long variant; false ⇒ short variant. */
  wantLong: boolean
  /** Lesson-wide last-chosen pair key — excluded so we don't repeat consecutively. */
  lastPairKey: string | null
}

export interface CorrectReaction {
  text: string
  pairKey: string
}

/**
 * Pick a reaction from the pool. Excludes `lastPairKey` when the pool has
 * at least two entries — guarantees no back-to-back repeats. Deterministic
 * fallback when the pool is exhausted (shouldn't happen with the constant
 * above, but keeps the function total).
 */
export function pickCorrectReaction({
  wantLong,
  lastPairKey,
}: PickCorrectReactionArgs): CorrectReaction {
  const pool = CORRECT_RESPONSE_PAIRS
  const candidates =
    pool.length > 1 && lastPairKey ? pool.filter((p) => p.key !== lastPairKey) : pool.slice()
  const pick = candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0]
  return { text: wantLong ? pick.long : pick.short, pairKey: pick.key }
}

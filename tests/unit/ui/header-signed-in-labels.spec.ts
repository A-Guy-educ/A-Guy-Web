import { describe, expect, it } from 'vitest'

import { getExamCountdownLabel } from '@/ui/web/header/SignedInBar/ExamCountdownLink'
import { getUsagePercent } from '@/ui/web/UserDropdown/useMonthlyTokenUsagePercent'

const t = (key: string) => (key === 'examInDays' ? 'In {days} days' : key)

describe('getExamCountdownLabel', () => {
  it('prompts to set an exam when none is upcoming', () => {
    expect(getExamCountdownLabel(null, t)).toBe('setExam')
  })

  it('names today and tomorrow', () => {
    expect(getExamCountdownLabel(0, t)).toBe('examToday')
    expect(getExamCountdownLabel(1, t)).toBe('examTomorrow')
  })

  it('counts the remaining days', () => {
    expect(getExamCountdownLabel(6, t)).toBe('In 6 days')
  })
})

describe('getUsagePercent', () => {
  const window = (used: number, limit: number | null) => ({ used, limit, resetAt: null })

  it('rounds the share of the budget used', () => {
    expect(getUsagePercent(window(2, 3))).toBe(67)
  })

  it('caps at 100 when usage passes the limit', () => {
    expect(getUsagePercent(window(150, 100))).toBe(100)
  })

  it('returns null without a usable limit', () => {
    expect(getUsagePercent(window(5, null))).toBeNull()
    expect(getUsagePercent(window(5, 0))).toBeNull()
  })
})

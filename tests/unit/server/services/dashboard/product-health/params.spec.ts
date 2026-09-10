import { describe, expect, it } from 'vitest'

import { parseProductHealthParams } from '@/server/services/dashboard/product-health/params'

function search(pairs: Record<string, string>): URLSearchParams {
  return new URLSearchParams(pairs)
}

describe('parseProductHealthParams', () => {
  it('applies defaults when nothing is passed', () => {
    const result = parseProductHealthParams(search({}))
    expect(result).toEqual({
      ok: true,
      params: {
        range: '30d',
        start: null,
        end: null,
        courseId: null,
        granularity: 'daily',
      },
    })
  })

  it('accepts the enumerated ranges and granularities', () => {
    const result = parseProductHealthParams(search({ range: '90d', granularity: 'monthly' }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.params.range).toBe('90d')
      expect(result.params.granularity).toBe('monthly')
    }
  })

  it('requires both start and end when range=custom', () => {
    const result = parseProductHealthParams(search({ range: 'custom', start: '2026-03-01' }))
    expect(result).toEqual({ ok: false, error: 'range=custom requires both start and end' })
  })

  it('rejects an end that precedes start', () => {
    const result = parseProductHealthParams(
      search({ range: 'custom', start: '2026-03-05', end: '2026-03-01' }),
    )
    expect(result).toEqual({ ok: false, error: 'end must be on or after start' })
  })

  it('rejects malformed courseId', () => {
    const result = parseProductHealthParams(search({ courseId: 'not-hex' }))
    expect(result.ok).toBe(false)
  })

  it('accepts a valid 24-hex courseId', () => {
    const id = '507f1f77bcf86cd799439011'
    const result = parseProductHealthParams(search({ courseId: id }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.params.courseId).toBe(id)
  })
})

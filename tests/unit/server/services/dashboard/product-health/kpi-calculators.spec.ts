import { describe, expect, it } from 'vitest'

import {
  activeUserRate,
  buildKpiContext,
  engagementRate,
  inactiveChurnRate,
  newRegistrations,
  pdfScrollUsabilityRate,
  retentionRate,
  type KpiContext,
} from '@/server/services/dashboard/product-health/kpi-calculators'
import type {
  AllSignals,
  UserDay,
  VisitDay,
} from '@/server/services/dashboard/product-health/signal-types'
import type { Window } from '@/server/services/dashboard/product-health/windows'

const window: Window = {
  start: new Date('2026-03-01T00:00:00.000Z'),
  end: new Date('2026-03-08T00:00:00.000Z'),
}

/** Active visit day: one PDF visit with plenty of dwell. */
function active(userId: string, date: string): VisitDay {
  return { userId, date, maxPdfDwellSeconds: 600 }
}

function context(
  overrides: Partial<AllSignals> = {},
  { lookbackDays = 7, dwell = 60 }: { lookbackDays?: number; dwell?: number } = {},
): KpiContext {
  const signals: AllSignals = {
    visitDays: [],
    chatDays: [],
    pdfVisitDays: [],
    registrationDays: [],
    visitLogCoverageStart: '2026-01-01',
    ...overrides,
  }
  return buildKpiContext(signals, {
    retentionLookbackDays: lookbackDays,
    activeDwellSeconds: dwell,
  })
}

describe('activeUserRate', () => {
  it('counts users with a ≥threshold PDF visit over users with any visit', () => {
    const visitDays: VisitDay[] = [
      active('u1', '2026-03-02'),
      active('u1', '2026-03-04'), // deduped
      active('u2', '2026-03-07'),
      active('u3', '2026-02-28'), // before window → excluded
      { userId: 'u4', date: '2026-03-05', maxPdfDwellSeconds: 59 }, // present, not active
      { userId: 'u5', date: '2026-03-05', maxPdfDwellSeconds: 0 }, // non-PDF visit only
    ]
    expect(activeUserRate(context({ visitDays }), window)).toEqual({
      numerator: 2,
      denominator: 4,
    })
  })

  it('applies the dwell threshold from the request, not a fixed 60s', () => {
    const visitDays: VisitDay[] = [
      { userId: 'u1', date: '2026-03-02', maxPdfDwellSeconds: 90 },
      { userId: 'u2', date: '2026-03-02', maxPdfDwellSeconds: 400 },
    ]
    expect(activeUserRate(context({ visitDays }, { dwell: 300 }), window)).toEqual({
      numerator: 1,
      denominator: 2,
    })
  })

  it('returns denominator=0 when no user was present in the window', () => {
    expect(activeUserRate(context(), window)).toEqual({ numerator: 0, denominator: 0 })
  })

  it('reports no data for a window that starts before the visit log covers it', () => {
    const visitDays = [active('u1', '2026-03-05')]
    const ctx = context({ visitDays, visitLogCoverageStart: '2026-03-03' })
    expect(activeUserRate(ctx, window)).toEqual({ numerator: 0, denominator: 0 })
  })

  it('reports no data when the visit log is empty', () => {
    const ctx = context({ visitLogCoverageStart: null })
    expect(activeUserRate(ctx, window)).toEqual({ numerator: 0, denominator: 0 })
  })
})

describe('engagementRate', () => {
  it('only counts chatting users who are also active', () => {
    const visitDays = [active('u1', '2026-03-02'), active('u2', '2026-03-03')]
    const chatDays: UserDay[] = [
      { userId: 'u1', date: '2026-03-02' },
      { userId: 'u9', date: '2026-03-04' }, // chatted but not active — excluded
    ]
    expect(engagementRate(context({ visitDays, chatDays }), window)).toEqual({
      numerator: 1,
      denominator: 2,
    })
  })
})

describe('retentionRate', () => {
  it('uses a prior window as long as the lookback (7d → days 14–7 ago)', () => {
    const visitDays: VisitDay[] = [
      // u1 active in prior (2026-02-22..03-01) AND current
      active('u1', '2026-02-25'),
      active('u1', '2026-03-03'),
      // u2 active in prior only
      active('u2', '2026-02-28'),
      // u3 active only before the 7d prior window → not in denominator
      active('u3', '2026-02-10'),
      active('u3', '2026-03-04'),
      // u4 active in current only
      active('u4', '2026-03-05'),
    ]
    expect(retentionRate(context({ visitDays }, { lookbackDays: 7 }), window)).toEqual({
      numerator: 1,
      denominator: 2,
    })
  })

  it('keeps an earlier visit to a lesson the user revisits later', () => {
    // Same lesson, two visits: per-visit days survive the revisit (the
    // lastAccessedAt overwrite used to drop the 02-25 activity).
    const visitDays = [active('u1', '2026-02-25'), active('u1', '2026-03-06')]
    expect(retentionRate(context({ visitDays }), window)).toEqual({
      numerator: 1,
      denominator: 1,
    })
  })

  it('reports no data when the prior window predates the visit log', () => {
    const visitDays = [active('u1', '2026-02-25'), active('u1', '2026-03-03')]
    const ctx = context({ visitDays, visitLogCoverageStart: '2026-02-24' })
    expect(retentionRate(ctx, window)).toEqual({ numerator: 0, denominator: 0 })
  })
})

describe('inactiveChurnRate', () => {
  it('measures users active in the equal-length prior window who are NOT active now', () => {
    const visitDays: VisitDay[] = [
      active('u1', '2026-02-25'), // prior only → churned
      active('u2', '2026-02-27'), // prior + current → retained
      active('u2', '2026-03-02'),
      active('u3', '2026-03-04'), // current only → not counted
    ]
    expect(inactiveChurnRate(context({ visitDays }), window)).toEqual({
      numerator: 1,
      denominator: 2,
    })
  })

  it('does not count a sub-threshold return as staying active', () => {
    const visitDays: VisitDay[] = [
      active('u1', '2026-02-25'),
      { userId: 'u1', date: '2026-03-02', maxPdfDwellSeconds: 5 },
    ]
    expect(inactiveChurnRate(context({ visitDays }), window)).toEqual({
      numerator: 1,
      denominator: 1,
    })
  })
})

describe('pdfScrollUsabilityRate', () => {
  it('sums scrolled PDF visits over all PDF visits inside the window', () => {
    const pdfVisitDays = [
      { date: '2026-03-01', visits: 4, scrolled: 3 },
      { date: '2026-03-07', visits: 6, scrolled: 1 },
      { date: '2026-02-28', visits: 9, scrolled: 9 }, // before window
      { date: '2026-03-08', visits: 9, scrolled: 0 }, // exclusive end
    ]
    expect(pdfScrollUsabilityRate(context({ pdfVisitDays }), window)).toEqual({
      numerator: 4,
      denominator: 10,
    })
  })
})

describe('newRegistrations', () => {
  it('counts registration days inside the half-open window', () => {
    const registrationDays = ['2026-02-28', '2026-03-01', '2026-03-01', '2026-03-07', '2026-03-08']
    expect(newRegistrations(context({ registrationDays }), window)).toBe(3)
  })

  it('ignores visit-log coverage — registrations have full history', () => {
    const ctx = context({ registrationDays: ['2026-03-02'], visitLogCoverageStart: null })
    expect(newRegistrations(ctx, window)).toBe(1)
  })
})

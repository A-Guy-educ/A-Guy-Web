/**
 * Query param parsing + validation for the Product Health slice of
 * /api/dashboard-metrics.
 *
 * Contract:
 *   ?range=7d|30d|90d|custom  (default 30d)
 *   &start=YYYY-MM-DD          (required when range=custom)
 *   &end=YYYY-MM-DD            (required when range=custom)
 *   &courseId=<24-hex>         (omit = All Courses)
 *   &granularity=daily|weekly|monthly  (default daily)
 *
 * `start`/`end` are anchored to UTC midnight. `end` is treated as exclusive
 * upstream (see windows.ts) so the caller can pass "the same day" without
 * off-by-one on the last bucket.
 */

import { z } from 'zod'

import type { Granularity, PeriodRange } from './types'

const HEX24 = /^[a-f0-9]{24}$/i
const YMD = /^\d{4}-\d{2}-\d{2}$/

const rawSchema = z.object({
  range: z.enum(['7d', '30d', '90d', 'custom']).optional(),
  start: z.string().regex(YMD, 'start must be YYYY-MM-DD').optional(),
  end: z.string().regex(YMD, 'end must be YYYY-MM-DD').optional(),
  courseId: z.string().regex(HEX24, 'courseId must be a 24-char hex id').optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional(),
})

export interface ParsedProductHealthParams {
  range: PeriodRange
  start: string | null
  end: string | null
  courseId: string | null
  granularity: Granularity
}

export type ProductHealthParamsResult =
  | { ok: true; params: ParsedProductHealthParams }
  | { ok: false; error: string }

export function parseProductHealthParams(search: URLSearchParams): ProductHealthParamsResult {
  const parsed = rawSchema.safeParse({
    range: search.get('range') ?? undefined,
    start: search.get('start') ?? undefined,
    end: search.get('end') ?? undefined,
    courseId: search.get('courseId') ?? undefined,
    granularity: search.get('granularity') ?? undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid params' }
  }

  const range = parsed.data.range ?? '30d'
  const granularity = parsed.data.granularity ?? 'daily'

  if (range === 'custom') {
    if (!parsed.data.start || !parsed.data.end) {
      return { ok: false, error: 'range=custom requires both start and end' }
    }
    if (parsed.data.end < parsed.data.start) {
      return { ok: false, error: 'end must be on or after start' }
    }
  }

  return {
    ok: true,
    params: {
      range,
      start: parsed.data.start ?? null,
      end: parsed.data.end ?? null,
      courseId: parsed.data.courseId ?? null,
      granularity,
    },
  }
}

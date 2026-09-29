import { createHash } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { logger } from '@/infra/utils/logger'
import { applyRateLimitHeaders, checkRateLimit } from '@/server/services/rate-limit'

// Heavy Genkit / Payload deps are dynamically imported inside the handler so
// `next build`'s "Collecting page data" step does not evaluate provider code
// (which would fail at build time when GEMINI env is not present).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_QUERY_LENGTH = 200
const MAX_LESSONS = 100
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60_000

const bodySchema = z.object({
  query: z.string().min(1).max(MAX_QUERY_LENGTH),
  locale: z.enum(['en', 'he']),
  courseTitle: z.string().min(1).max(200),
  lessons: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        chapter: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(MAX_LESSONS),
})

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24)
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  const userAgent = request.headers.get('user-agent') ?? 'unknown'

  const rate = await checkRateLimit(hash(ip), hash(userAgent), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  if (!rate.allowed) {
    const res = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    applyRateLimitHeaders(res.headers, rate, RATE_LIMIT_MAX)
    return res
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const [{ getPayload }, { generateLessonSuggestion }] = await Promise.all([
    import('@/infra/types/backend'),
    import('@/server/services/lesson-suggest/generateLessonSuggestion'),
  ])

  const payload = await getPayload()
  const result = await generateLessonSuggestion(body, payload)

  if (!result.success) {
    logger.warn({ error: result.error }, '[LessonSuggest] service returned failure')
    return NextResponse.json({ error: 'Suggestion unavailable' }, { status: 502 })
  }

  const res = NextResponse.json({ message: result.message })
  applyRateLimitHeaders(res.headers, rate, RATE_LIMIT_MAX)
  return res
}

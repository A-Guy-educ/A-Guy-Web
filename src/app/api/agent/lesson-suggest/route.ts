import { createHash } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { logger } from '@/infra/utils/logger'
import { requireUser } from '@/server/auth/api-auth'
import { applyRateLimitHeaders, checkRateLimit } from '@/server/services/rate-limit'

// Heavy Genkit / Payload deps are dynamically imported inside the handler so
// `next build`'s "Collecting page data" step does not evaluate provider code
// (which would fail at build time when GEMINI env is not present).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_QUERY_LENGTH = 200
const MAX_LESSONS = 300
// ~2.2 MB decoded. The composer downscales photos to well under this before
// sending; the cap keeps the body inside Vercel's 4.5 MB request limit.
const MAX_IMAGE_BASE64_LENGTH = 3_000_000
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60_000

const bodySchema = z
  .object({
    query: z.string().max(MAX_QUERY_LENGTH).default(''),
    locale: z.enum(['en', 'he']),
    courseTitle: z.string().min(1).max(200),
    lessons: z
      .array(
        z.object({
          id: z.string().min(1).max(64),
          title: z.string().min(1).max(200),
          chapter: z.string().max(200).optional(),
          type: z.string().max(32).optional(),
        }),
      )
      .min(1)
      .max(MAX_LESSONS),
    image: z
      .object({
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
        data: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH),
      })
      .optional(),
  })
  .refine((body) => body.query.trim().length > 0 || body.image, {
    message: 'query or image required',
  })

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24)
}

export async function POST(request: NextRequest) {
  // public endpoint — course pages are browsable without login, so the
  // composer's text suggestions must work for anonymous visitors too.
  // Abuse is bounded by the per-IP+UA rate limit below and the strict Zod
  // body cap (query ≤ 200 chars, lessons ≤ 300). Photo suggestions cost far
  // more per call, so those require a signed-in user (checked after parsing).
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

  if (body.image) {
    const auth = await requireUser(request)
    if (!auth.ok) return auth.response
  }

  const { generateLessonSuggestion } =
    await import('@/server/services/lesson-suggest/generateLessonSuggestion')
  const result = await generateLessonSuggestion(body)

  if (!result.success) {
    logger.warn({ error: result.error }, '[LessonSuggest] service returned failure')
    return NextResponse.json({ error: 'Suggestion unavailable' }, { status: 502 })
  }

  const res = NextResponse.json(result.suggestion)
  applyRateLimitHeaders(res.headers, rate, RATE_LIMIT_MAX)
  return res
}

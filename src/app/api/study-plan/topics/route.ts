import { createHash } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { logger } from '@/infra/utils/logger'
import { requireUser } from '@/server/auth/api-auth'
import { applyRateLimitHeaders, checkRateLimit } from '@/server/services/rate-limit'

// The Gemini service is imported inside the handler, as in lesson-suggest, so
// `next build` never evaluates provider code without its env.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_TEXT_LENGTH = 2000
const MAX_LESSONS = 300
// ~2.2 MB decoded: photos are downscaled well under this on the client; PDFs
// are checked against it before upload. Keeps the body under Vercel's 4.5 MB.
const MAX_FILE_BASE64_LENGTH = 3_000_000
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

const bodySchema = z
  .object({
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
    text: z.string().max(MAX_TEXT_LENGTH).optional(),
    file: z
      .object({
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
        data: z.string().min(1).max(MAX_FILE_BASE64_LENGTH),
      })
      .optional(),
  })
  .refine((body) => (body.text?.trim().length ?? 0) > 0 || body.file, {
    message: 'text or file required',
  })

const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 24)

/**
 * Reads an exam's topic list (photo, PDF or text) and matches each topic to
 * the course's lessons, for the prep plan. Signed-in only: plans are saved
 * per student, and reading a file is the expensive kind of model call. The
 * course's lessons come in the body, as with the composer's suggestions.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const rate = await checkRateLimit(
    hash(auth.value.id),
    hash('exam-topics'),
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  )
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

  const { matchExamTopics } = await import('@/server/services/exam-topics/matchExamTopics')
  const result = await matchExamTopics(body)
  if (!result.success) {
    logger.warn({ error: result.error }, '[ExamTopics] service returned failure')
    return NextResponse.json({ error: 'Topic matching unavailable' }, { status: 502 })
  }

  const res = NextResponse.json({ topics: result.topics })
  applyRateLimitHeaders(res.headers, rate, RATE_LIMIT_MAX)
  return res
}

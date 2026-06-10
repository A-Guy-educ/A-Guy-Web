import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCourseSearchResults } from '@/server/services/course-search-service'

const searchParamsSchema = z.object({
  q: z.string().min(2).max(200),
  courseSlug: z.string().min(1).optional(),
})

export async function GET(request: NextRequest) {
  const parsed = searchParamsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { q: query, courseSlug } = parsed.data
  const results = await getCourseSearchResults({ query, courseSlug })
  if (!results) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  return NextResponse.json(results)
}

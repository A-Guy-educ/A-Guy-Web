import { NextResponse } from 'next/server'

import { getPublishedCourseList } from '@/server/services/course-list-service'

export const runtime = 'nodejs'

export async function GET() {
  const docs = await getPublishedCourseList()
  return NextResponse.json({
    docs,
    totalDocs: docs.length,
    limit: docs.length,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })
}

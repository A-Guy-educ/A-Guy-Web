import { NextResponse } from 'next/server'
import { queryPublishedCourses } from '@/lib/queries/courses'

export async function GET() {
  try {
    const courses = await queryPublishedCourses()

    return NextResponse.json({
      docs: courses,
      totalDocs: courses.length,
    })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ docs: [], totalDocs: 0 }, { status: 500 })
  }
}

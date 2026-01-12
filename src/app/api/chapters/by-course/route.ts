import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseSlug = searchParams.get('courseSlug')

    if (!courseSlug) {
      return NextResponse.json({ error: 'courseSlug is required' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })

    // Find the course by slug
    const courseResult = await payload.find({
      collection: 'courses',
      where: {
        slug: {
          equals: courseSlug,
        },
      },
      limit: 1,
      pagination: false,
    })

    if (courseResult.docs.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const course = courseResult.docs[0]

    // Find chapters for this course
    const chaptersResult = await payload.find({
      collection: 'chapters',
      where: {
        course: {
          equals: course.id,
        },
      },
      sort: 'order',
      depth: 1,
    })

    return NextResponse.json({
      chapters: chaptersResult.docs,
      courseSlug: course.slug,
    })
  } catch (error) {
    console.error('Error fetching chapters by course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

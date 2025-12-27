import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import logger from '@/lib/logger'

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  content: z.string().min(1, 'Content is required'),
  status: z.enum(['draft', 'published']).default('draft'),
})

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    logger.info({ requestId, path: req.nextUrl.pathname }, 'POST /api/posts')

    const body = await req.json()
    const validatedData = createPostSchema.parse(body)

    logger.info({ requestId, data: validatedData }, 'Post data validated successfully')

    // Here you would typically save to Payload CMS
    // const post = await payload.create({ collection: 'posts', data: validatedData })

    return NextResponse.json(
      {
        success: true,
        message: 'Post created successfully',
        data: validatedData,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ requestId, errors: error.issues }, 'Validation error')
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: error.issues,
        },
        { status: 400 },
      )
    }

    logger.error({ requestId, error }, 'Internal server error')
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 },
    )
  }
}

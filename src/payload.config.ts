import { mongooseAdapter } from '@payloadcms/db-mongodb'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { addDataAndFileToRequest, buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'
import { extractFromImage } from '@/lib/ai/services/data-extractor-service'
import type { Media as MediaType } from '@/payload-types'

import { Categories } from './collections/Categories'
import { Chapters } from './collections/Chapters'
import { Courses } from './collections/Courses'
import { Exercises } from './collections/Exercises'
import { ExerciseAssets } from './collections/ExerciseAssets'
import { Lessons } from './collections/Lessons'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { PricingPlans } from './collections/PricingPlans'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// AI Image Upload Validation
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

type UploadedFileLike = {
  mimetype?: string
  size?: number
  data?: Buffer
  buffer?: Buffer
}

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  collections: [
    Pages,
    Categories,
    Courses,
    Chapters,
    Lessons,
    Exercises,
    ExerciseAssets,
    Users,
    Media,
    Posts,
    PricingPlans,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  endpoints: [
    {
      path: '/exercises/import',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        // 1) Auth - endpoints not authenticated by default
        if (!req.user) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401 },
          )
        }

        // 2) Parse multipart (Payload doesn't auto-attach data/file)
        await addDataAndFileToRequest(req)

        const file = (req as any).file as UploadedFileLike | undefined
        const data = (req as any).data as Record<string, unknown> | undefined

        if (!file) {
          return Response.json({ success: false, error: 'Image file is required' }, { status: 400 })
        }

        const mimeType = file.mimetype
        const fileSize = file.size ?? 0
        const imageBuffer = file.data ?? file.buffer

        if (!imageBuffer || !mimeType) {
          return Response.json({ success: false, error: 'Invalid uploaded file' }, { status: 400 })
        }

        // 3) Validate
        if (fileSize > MAX_FILE_SIZE) {
          return Response.json(
            { success: false, error: 'File size must be under 10MB' },
            { status: 400 },
          )
        }

        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
          return Response.json(
            { success: false, error: 'Invalid file type. Allowed: PNG, JPG, WEBP' },
            { status: 400 },
          )
        }

        // 4) Call AI service (image only, no additional text)
        const result = await extractFromImage({
          imageBuffer,
          mimeType,
        })

        if (!result.success) {
          return Response.json(
            { success: false, error: result.error || 'Failed to process image' },
            { status: 500 },
          )
        }

        return Response.json({
          success: true,
          data: result.data,
          metadata: result.metadata,
        })
      },
    },
    {
      path: '/lessons/:id/import-exercise',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        // 1) Auth - endpoints not authenticated by default
        if (!req.user) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401 },
          )
        }

        // 2) Get lessonId from URL params
        const lessonId = req.routeParams?.id

        if (!lessonId || typeof lessonId !== 'string') {
          return Response.json({ success: false, error: 'Lesson ID is required' }, { status: 400 })
        }

        // 3) Fetch lesson with contentFile
        const lesson = await req.payload.findByID({
          collection: 'lessons',
          id: lessonId,
          depth: 1,
        })

        if (!lesson) {
          return Response.json({ success: false, error: 'Lesson not found' }, { status: 404 })
        }

        // 4) Check if contentFile exists
        const contentFile = lesson.contentFile as MediaType | null | undefined
        if (!contentFile || !contentFile.url) {
          return Response.json(
            { success: false, error: 'Lesson has no content file to convert' },
            { status: 400 },
          )
        }

        // 5) Read image from filesystem
        let imageBuffer: Buffer
        let mimeType: string

        try {
          const filename = contentFile.filename || path.basename(contentFile.url)
          const filePath = path.join(process.cwd(), 'public', 'media', filename)
          imageBuffer = fs.readFileSync(filePath)

          const ext = path.extname(filename).toLowerCase()
          const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
          }
          mimeType = mimeTypes[ext] || 'image/jpeg'
        } catch (readError) {
          return Response.json(
            { success: false, error: 'Failed to read lesson content file from disk' },
            { status: 500 },
          )
        }

        // 6) Extract data from image
        const result = await extractFromImage({
          imageBuffer,
          mimeType,
        })

        if (!result.success) {
          return Response.json(
            { success: false, error: result.error || 'Failed to process image' },
            { status: 500 },
          )
        }

        // 7) Create exercise from extracted data
        if (result.data) {
          try {
            const hasOptions = result.data.options && result.data.options.length > 0

            let answerSpecJson
            if (hasOptions) {
              answerSpecJson = {
                questionType: 'mcq',
                multiSelect: false,
                options: result.data.options.map((opt: string, i: number) => ({
                  id: `opt-${i + 1}`,
                  content: [
                    {
                      id: `opt-${i + 1}-text`,
                      type: 'rich_text',
                      format: 'md-math-v1',
                      value: opt,
                    },
                  ],
                })),
                correctOptionIds:
                  result.data.correctAnswer !== null && result.data.correctAnswer !== undefined
                    ? [`opt-${result.data.correctAnswer + 1}`]
                    : ['opt-1'],
              }
            } else {
              answerSpecJson = {
                questionType: 'free_response',
                responseKind: 'text',
                acceptedAnswers: [result.data.explanation || 'See solution'],
              }
            }

            const exerciseDoc = await req.payload.create({
              collection: 'exercises',
              data: {
                title: 'AI Generated Exercise',
                order: 0,
                lesson: lessonId,
                content: {
                  blocks: [
                    {
                      id: 'ai-generated-1',
                      type: 'rich_text',
                      format: 'md-math-v1',
                      value: result.data.question,
                      mediaIds: [],
                    },
                  ],
                },
                // @ts-expect-error - answerSpecJson is dynamic
                answerSpecJson,
              },
            })

            return Response.json({
              success: true,
              data: result.data,
              metadata: result.metadata,
              exerciseId: exerciseDoc.id,
            })
          } catch (createError) {
            return Response.json({
              success: true,
              data: result.data,
              metadata: result.metadata,
              error: 'AI conversion succeeded but exercise creation failed',
            })
          }
        }

        return Response.json({
          success: true,
          data: result.data,
          metadata: result.metadata,
        })
      },
    },
  ],
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
})

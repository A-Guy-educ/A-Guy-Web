import fs from 'fs/promises'

import type { Document } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { resolveMediaFilePath } from '@/infra/config/storage'
import { getContentDb, objectIdFromString } from '@/infra/db/content-db'
import { InteractiveLessonResponseSchema } from '@/infra/llm/services/interactive-lesson/interactive-lesson-schema'
import type { InteractiveLesson } from '@/infra/llm/services/interactive-lesson/interactive-lesson-types'

const BodySchema = z.object({
  mediaId: z.string().min(1),
  locale: z.enum(['he', 'en']).default('he'),
})

function fallbackLesson(locale: 'he' | 'en'): InteractiveLesson {
  const he = locale === 'he'
  return {
    title: he ? 'הסבר חזותי' : 'Visual explanation',
    locale,
    geometry: { width: 400, height: 260, points: [], segments: [], angles: [], labels: [] },
    graph: { xRange: [-10, 10], yRange: [-10, 10], plots: [], markers: [] },
    numberLine: { range: [-10, 10], marks: [], intervals: [] },
    steps: [
      {
        id: 1,
        title: he ? 'נזהה את הנתונים' : 'Identify the givens',
        claim: he ? 'נבדוק מה מופיע בשאלה' : 'Read the information in the problem',
        reason: he ? 'מתוך התמונה' : 'From the uploaded image',
        narration: he
          ? 'נתחיל בזיהוי הנתונים החשובים בתרגיל.'
          : 'Start by identifying the important information in the exercise.',
        explanation: he
          ? 'העלה את התמונה לצ׳אט ושאל על שלב מסוים אם תרצה פירוט מדויק יותר.'
          : 'Use the chat for a more precise step-by-step explanation of this image.',
        durationSeconds: 6,
        highlightSegments: [],
        highlightPoints: [],
        highlightPlots: [],
        highlightMarkers: [],
        highlightMarks: [],
        highlightIntervals: [],
      },
      {
        id: 2,
        title: he ? 'נבנה דרך פתרון' : 'Build a solution path',
        claim: he ? 'נשתמש בנתונים כדי להתקדם' : 'Use the givens to move forward',
        reason: he ? 'הסקה מתמטית' : 'Mathematical reasoning',
        narration: he
          ? 'אחרי שהנתונים ברורים, נבחר את הכלל או הנוסחה המתאימים.'
          : 'Once the givens are clear, choose the matching rule or formula.',
        explanation: he
          ? 'אם נדרש, הצ׳אט יכול לפתור את התרגיל עצמו לפי התמונה שהעלית.'
          : 'If needed, the chat can solve the exercise directly from the uploaded image.',
        durationSeconds: 7,
        highlightSegments: [],
        highlightPoints: [],
        highlightPlots: [],
        highlightMarkers: [],
        highlightMarks: [],
        highlightIntervals: [],
      },
    ],
  }
}

async function loadMedia(mediaId: string) {
  const db = await getContentDb()
  const media = await db
    .collection('media')
    .findOne({ _id: objectIdFromString(mediaId) } as Document)
  if (!media) return null

  if (typeof media.url === 'string' && media.url) {
    const response = await fetch(media.url)
    if (!response.ok) throw new Error(`Failed to fetch media: ${response.status}`)
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: String(media.mimeType || response.headers.get('content-type') || 'image/png'),
    }
  }

  if (typeof media.filename === 'string') {
    return {
      buffer: await fs.readFile(resolveMediaFilePath(media.filename)),
      mimeType: String(media.mimeType || 'application/octet-stream'),
    }
  }

  return null
}

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .trim()
}

async function generateWithGemini(
  buffer: Buffer,
  mimeType: string,
  locale: 'he' | 'en',
): Promise<InteractiveLesson | null> {
  if (!process.env.GEMINI_API_KEY) return null

  const prompt =
    locale === 'he'
      ? 'נתח את תרגיל המתמטיקה בתמונה והחזר JSON בלבד לפי הסכמה: title, geometry, graph, numberLine, steps. כל הטקסט בעברית. אם אין גרף או ציר מספרים החזר מערכים ריקים.'
      : 'Analyze the math exercise in the image and return JSON only with: title, geometry, graph, numberLine, steps. Use English. Use empty arrays for graph or numberLine when absent.'

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: buffer.toString('base64') } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    },
  )

  if (!response.ok) return null
  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('') ?? ''
  if (!text) return null

  const parsed = InteractiveLessonResponseSchema.safeParse(JSON.parse(cleanJson(text)))
  if (!parsed.success) return null
  return { ...parsed.data, locale } as unknown as InteractiveLesson
}

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'mediaId is required' }, { status: 400 })
  }

  try {
    const media = await loadMedia(parsed.data.mediaId)
    if (!media)
      return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 })

    const lesson =
      (await generateWithGemini(media.buffer, media.mimeType, parsed.data.locale).catch(
        () => null,
      )) ?? fallbackLesson(parsed.data.locale)

    return NextResponse.json({
      success: true,
      data: lesson,
      metadata: {
        model: process.env.GEMINI_API_KEY ? 'gemini-2.5-flash' : 'fallback',
        imageSizeBytes: media.buffer.length,
        processingTimeMs: 0,
      },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: fallbackLesson(parsed.data.locale),
      metadata: { model: 'fallback', imageSizeBytes: 0, processingTimeMs: 0 },
    })
  }
}

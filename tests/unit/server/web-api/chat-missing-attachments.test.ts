import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { ObjectId } from 'mongodb'

vi.mock('@/infra/db/content-db', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getContentDb: vi.fn(),
    objectIdFromString: (id: string) => id,
    serializeDoc: (doc: unknown) => doc,
  }
})

vi.mock('@/infra/config/storage', () => ({
  resolveMediaFilePath: (filename: string) => `/tmp/${filename}`,
}))

vi.mock('@/infra/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/server/services/course-access', () => ({
  findCourseAccessGrants: vi.fn(async () => ({
    entitlement: null,
    enrollment: null,
    legacyEntitlements: [],
  })),
  grantsAccess: () => true,
}))

import { getContentDb } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger'
import { loadTutorResources } from '@/server/web-api/chat'

const getContentDbMock = getContentDb as Mock

const OWNER_ID = '65f000000000000000000099'
const LESSON_ID = '65f000000000000000000002'
const CHAPTER_ID = '65f000000000000000000010'
const COURSE_ID = '65f000000000000000000020'
const PDF_ID = '65f000000000000000000030'
const PDF_URL = 'https://blob.example/exam.pdf'
const PDF_BYTES = Buffer.from('%PDF-1.4 exam')

let lessonMedia: Record<string, unknown>[] = []

function collection(name: string) {
  return {
    findOne: vi.fn(async () => {
      if (name === 'lessons') {
        return {
          _id: new ObjectId(LESSON_ID),
          lessonContextText: '',
          chapter: new ObjectId(CHAPTER_ID),
          contentFiles: lessonMedia.map((item) => item._id),
        }
      }
      if (name === 'chapters') return { course: new ObjectId(COURSE_ID) }
      if (name === 'courses') return { accessType: 'free' }
      return null
    }),
    find: vi.fn(() => ({
      limit: () => ({ toArray: async () => (name === 'media' ? lessonMedia : []) }),
      toArray: async () => [],
    })),
  }
}

function pdfMedia() {
  return {
    _id: new ObjectId(PDF_ID),
    originalFilename: 'exam.pdf',
    mimeType: 'application/pdf',
    filesize: PDF_BYTES.length,
    url: PDF_URL,
  }
}

function pdfResponse() {
  return new Response(PDF_BYTES, { headers: { 'Content-Type': 'application/pdf' } })
}

describe('lesson attachments that fail to load', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getContentDbMock.mockResolvedValue({ collection })
    lessonMedia = [pdfMedia()]
  })

  it('retries a transient upstream error and still delivers the PDF', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('cold start', { status: 503 }))
      .mockResolvedValueOnce(pdfResponse())
    vi.stubGlobal('fetch', fetchMock)

    const resources = await loadTutorResources({ ownerId: OWNER_ID, lessonId: LESSON_ID })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(resources.parts).toHaveLength(1)
    expect(resources.missingAttachments).toEqual([])
    expect(resources.attachmentText).not.toContain('could not be loaded')
  })

  it('reports, logs, and warns the model when the PDF cannot be fetched', async () => {
    const fetchMock = vi.fn(async () => new Response('down', { status: 502 }))
    vi.stubGlobal('fetch', fetchMock)

    const resources = await loadTutorResources({ ownerId: OWNER_ID, lessonId: LESSON_ID })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(resources.parts).toEqual([])
    expect(resources.missingAttachments).toEqual([
      { id: PDF_ID, name: 'exam.pdf', reason: 'HTTP 502' },
    ])
    expect(resources.attachmentText.startsWith('IMPORTANT:')).toBe(true)
    expect(resources.attachmentText).toContain('"exam.pdf"')
    expect(logger.warn).toHaveBeenCalledOnce()
  })

  it('does not retry a client error', async () => {
    const fetchMock = vi.fn(async () => new Response('gone', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const resources = await loadTutorResources({ ownerId: OWNER_ID, lessonId: LESSON_ID })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(resources.missingAttachments).toHaveLength(1)
  })

  it('treats file types the model never receives as skipped, not missing', async () => {
    lessonMedia = [{ ...pdfMedia(), originalFilename: 'intro.mp4', mimeType: 'video/mp4' }]
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const resources = await loadTutorResources({ ownerId: OWNER_ID, lessonId: LESSON_ID })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(resources.missingAttachments).toEqual([])
    expect(logger.warn).not.toHaveBeenCalled()
  })
})

/**
 * Route tests for /api/notebook/pages and /api/notebook/pages/[pageId].
 *
 * The property that matters most is ownership: every read and write is scoped
 * to the signed-in student, so knowing another student's page id must not be
 * enough to read, overwrite or delete their work.
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockContentDb, type Doc } from './helpers/fake-content-db'

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof mockContentDb> | null }))
const mockGetWebUser = vi.hoisted(() => vi.fn())
const mockRateLimit = vi.hoisted(() => vi.fn())

vi.mock('@/infra/db/content-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/infra/db/content-db')>()
  return { ...actual, getContentDb: async () => db.current!.db }
})
vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser: mockGetWebUser }))
vi.mock('@/infra/security/rate-limit', () => ({
  rateLimit: mockRateLimit,
  rateLimitExceededResponse: () => Response.json({ error: 'rate_limited' }, { status: 429 }),
}))

const STUDENT = '507f1f77bcf86cd799439011'
const OTHER_STUDENT = '507f191e810c19729de860ea'
const PAGE_ID = '65a000000000000000000001'
const LESSON = 'lesson-1'

function storedPage(overrides: Doc = {}): Doc {
  return {
    _id: PAGE_ID,
    user: STUDENT,
    lesson: LESSON,
    height: 1150,
    cut: null,
    strokes: [],
    createdAt: new Date('2026-11-01T10:00:00Z'),
    updatedAt: new Date('2026-11-01T10:00:00Z'),
    ...overrides,
  }
}

function seed(pages: Doc[] = []) {
  db.current = mockContentDb({ notebook_pages: pages })
  return db.current
}

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('content-type', 'application/json')
  return new NextRequest(`http://localhost${path}`, { ...init, headers } as never)
}

const pageParams = (pageId = PAGE_ID) => ({ params: Promise.resolve({ pageId }) })

async function list(lessonId = LESSON) {
  const { GET } = await import('@/app/api/notebook/pages/route')
  const response = await GET(request(`/api/notebook/pages?lessonId=${lessonId}`))
  return { status: response.status, body: await response.json() }
}

async function create(body: unknown) {
  const { POST } = await import('@/app/api/notebook/pages/route')
  const response = await POST(
    request('/api/notebook/pages', { method: 'POST', body: JSON.stringify(body) }),
  )
  return { status: response.status, body: await response.json() }
}

async function patch(body: unknown, pageId = PAGE_ID) {
  const { PATCH } = await import('@/app/api/notebook/pages/[pageId]/route')
  const response = await PATCH(
    request(`/api/notebook/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    pageParams(pageId),
  )
  return { status: response.status, body: await response.json() }
}

async function remove(pageId = PAGE_ID) {
  const { DELETE } = await import('@/app/api/notebook/pages/[pageId]/route')
  const response = await DELETE(
    request(`/api/notebook/pages/${pageId}`, { method: 'DELETE' }),
    pageParams(pageId),
  )
  return { status: response.status, body: await response.json() }
}

const stroke = { ink: 0, points: [10, 10, 20, 25] }

beforeEach(() => {
  seed()
  mockGetWebUser.mockReset().mockResolvedValue({ id: STUDENT })
  mockRateLimit.mockReset().mockResolvedValue({ allowed: true })
})

describe('anonymous callers', () => {
  it('are refused on every method', async () => {
    mockGetWebUser.mockResolvedValue(null)

    expect((await list()).status).toBe(401)
    expect((await create({ lessonId: LESSON, height: 1150 })).status).toBe(401)
    expect((await patch({ strokes: [stroke] })).status).toBe(401)
    expect((await remove()).status).toBe(401)
  })
})

describe('GET /api/notebook/pages', () => {
  it("returns only the caller's pages for the requested lesson", async () => {
    seed([
      storedPage(),
      storedPage({ _id: '65a000000000000000000002', user: OTHER_STUDENT }),
      storedPage({ _id: '65a000000000000000000003', lesson: 'another-lesson' }),
    ])

    const { status, body } = await list()

    expect(status).toBe(200)
    expect(body.pages).toHaveLength(1)
    expect(body.pages[0]).toMatchObject({ id: PAGE_ID, lessonId: LESSON, height: 1150 })
  })

  it('rejects a request without a lesson', async () => {
    const { GET } = await import('@/app/api/notebook/pages/route')
    const response = await GET(request('/api/notebook/pages'))
    expect(response.status).toBe(400)
  })
})

describe('POST /api/notebook/pages', () => {
  it('creates an empty page owned by the caller', async () => {
    const fake = seed()

    const { status, body } = await create({ lessonId: LESSON, height: 1150 })

    expect(status).toBe(201)
    expect(body.page).toMatchObject({ lessonId: LESSON, height: 1150, cut: null, strokes: [] })
    expect(String(fake.collections.notebook_pages[0].user)).toBe(STUDENT)
  })

  it('keeps where a cut came from', async () => {
    const cut = {
      mediaId: 'media-1',
      url: 'https://blob.example.com/cut.png',
      width: 800,
      height: 240,
      source: {
        kind: 'pdf',
        mediaId: 'pdf-1',
        label: 'worksheet.pdf',
        page: 3,
        rect: { x: 0.1, y: 0.2, w: 0.5, h: 0.1 },
      },
    }

    const { status, body } = await create({ lessonId: LESSON, height: 1150, cut })

    expect(status).toBe(201)
    expect(body.page.cut).toEqual(cut)
  })

  it('rejects a cut whose image is not served over https', async () => {
    const cut = {
      mediaId: 'media-1',
      url: 'javascript:alert(1)',
      width: 800,
      height: 240,
      source: { kind: 'pdf', label: 'worksheet.pdf' },
    }
    expect((await create({ lessonId: LESSON, height: 1150, cut })).status).toBe(400)
  })

  it('rejects a page smaller than the minimum height', async () => {
    expect((await create({ lessonId: LESSON, height: 10 })).status).toBe(400)
  })

  it('answers 429 when the caller is creating pages too fast', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false })
    expect((await create({ lessonId: LESSON, height: 1150 })).status).toBe(429)
  })
})

describe('PATCH /api/notebook/pages/[pageId]', () => {
  it("saves strokes to the caller's page", async () => {
    const fake = seed([storedPage()])

    const { status } = await patch({ strokes: [stroke], height: 1750 })

    expect(status).toBe(200)
    expect(fake.collections.notebook_pages[0]).toMatchObject({ strokes: [stroke], height: 1750 })
  })

  it("cannot overwrite another student's page", async () => {
    const fake = seed([storedPage({ user: OTHER_STUDENT })])

    const { status } = await patch({ strokes: [stroke] })

    expect(status).toBe(404)
    expect(fake.collections.notebook_pages[0].strokes).toEqual([])
  })

  it('rejects an ink outside the palette', async () => {
    seed([storedPage()])
    expect((await patch({ strokes: [{ ink: 7, points: [1, 1, 2, 2] }] })).status).toBe(400)
  })

  it('rejects an empty update', async () => {
    seed([storedPage()])
    expect((await patch({})).status).toBe(400)
  })

  it('answers 404 for an id that cannot be a page', async () => {
    expect((await patch({ strokes: [stroke] }, 'not-an-id')).status).toBe(404)
  })
})

describe('DELETE /api/notebook/pages/[pageId]', () => {
  it("deletes the caller's page", async () => {
    const fake = seed([storedPage()])

    expect((await remove()).status).toBe(200)
    expect(fake.collections.notebook_pages).toHaveLength(0)
  })

  it("cannot delete another student's page", async () => {
    const fake = seed([storedPage({ user: OTHER_STUDENT })])

    expect((await remove()).status).toBe(404)
    expect(fake.collections.notebook_pages).toHaveLength(1)
  })
})

/**
 * @fileType unit-test
 * @domain billing
 * @pattern tier-lesson-access
 * @ai-summary Covers the opened-lesson counter reader: buckets user-progresses lesson records by lessons.type in first-opened order, skips deleted lessons, skips Mongo when the kill switch is off, and the per-page lock decision.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getContentDb } from '@/infra/db/content-db'
import { findUserProgress } from '@/server/web-api/progress'
import { getOpenedLessonIds, resolveLessonTierAccess } from '@/server/services/tier-lesson-access'

vi.mock('@/server/web-api/progress', () => ({ findUserProgress: vi.fn() }))
vi.mock('@/infra/db/content-db', () => ({
  getContentDb: vi.fn(),
  objectIdFromString: (id: string) => id,
}))

const findUserProgressMock = vi.mocked(findUserProgress)
const getContentDbMock = vi.mocked(getContentDb)

function mockLessons(docs: { _id: string; type?: string | null }[]) {
  const toArray = vi.fn().mockResolvedValue(docs)
  const find = vi.fn().mockReturnValue({ toArray })
  getContentDbMock.mockResolvedValue({ collection: () => ({ find }) } as never)
  return find
}

function mockRecords(ids: string[]) {
  findUserProgressMock.mockResolvedValue({
    id: 'p',
    user: 'u1',
    progressRecords: [
      { recordType: 'exercise', recordId: 'ex1' },
      ...ids.map((recordId) => ({ recordType: 'lesson', recordId, status: 'in_progress' })),
    ],
  })
}

describe('getOpenedLessonIds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED', 'on')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('buckets opened lessons by type in first-opened order', async () => {
    mockRecords(['p17', 'l1', 'p3', 'e1', 'legacy', 'p17'])
    mockLessons([
      { _id: 'p3', type: 'practice' },
      { _id: 'p17', type: 'practice' },
      { _id: 'l1', type: 'learning' },
      { _id: 'e1', type: 'exam' },
      { _id: 'legacy', type: null },
    ])

    await expect(getOpenedLessonIds('u1', 'grade-7')).resolves.toEqual({
      learning: ['l1', 'legacy'],
      practice: ['p17', 'p3'],
      exam: ['e1'],
    })
    expect(findUserProgressMock).toHaveBeenCalledWith('u1', 'grade-7')
  })

  it('does not count records whose lesson no longer exists', async () => {
    mockRecords(['gone', 'p1'])
    mockLessons([{ _id: 'p1', type: 'practice' }])
    const opened = await getOpenedLessonIds('u1', 'grade-7')
    expect(opened.practice).toEqual(['p1'])
    expect(opened.learning).toEqual([])
  })

  it('skips Mongo entirely when the kill switch is off', async () => {
    vi.stubEnv('NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED', '')
    const opened = await getOpenedLessonIds('u1', 'grade-7')
    expect(opened).toEqual({ learning: [], practice: [], exam: [] })
    expect(findUserProgressMock).not.toHaveBeenCalled()
  })

  it('returns empty lists for anonymous users', async () => {
    await expect(getOpenedLessonIds(null, 'grade-7')).resolves.toEqual({
      learning: [],
      practice: [],
      exam: [],
    })
    expect(findUserProgressMock).not.toHaveBeenCalled()
  })
})

describe('resolveLessonTierAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED', 'on')
    mockRecords(['p3', 'p17', 'p29', 'l5'])
    mockLessons([
      { _id: 'p3', type: 'practice' },
      { _id: 'p17', type: 'practice' },
      { _id: 'p29', type: 'practice' },
      { _id: 'l5', type: 'learning' },
    ])
  })
  afterEach(() => vi.unstubAllEnvs())

  const free = { id: 'u1', currentTier: 'free' }

  it('locks a 4th distinct practice lesson for free', async () => {
    const access = await resolveLessonTierAccess({
      user: free,
      lessonId: 'p1',
      lessonType: 'practice',
      gradeLevel: 'g',
    })
    expect(access).toEqual({ isLocked: true, learningOpenOrdinal: null })
  })

  it('reopens an already-opened practice lesson', async () => {
    const access = await resolveLessonTierAccess({
      user: free,
      lessonId: 'p17',
      lessonType: 'practice',
      gradeLevel: 'g',
    })
    expect(access.isLocked).toBe(false)
  })

  it('never locks a learning lesson and returns its opened ordinal', async () => {
    const access = await resolveLessonTierAccess({
      user: free,
      lessonId: 'l9',
      lessonType: 'learning',
      gradeLevel: 'g',
    })
    expect(access).toEqual({ isLocked: false, learningOpenOrdinal: 2 })
  })
})

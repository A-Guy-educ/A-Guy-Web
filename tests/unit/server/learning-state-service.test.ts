import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  findLearningStates,
  findLearningStatesByKind,
  findLessonChatPercents,
  saveLearningStates,
} from '@/server/services/learning-state'

const USER_ID = '64b7f0c2a1b2c3d4e5f60718'

const collection = vi.hoisted(() => ({
  find: vi.fn(),
  bulkWrite: vi.fn(),
}))

vi.mock('@/infra/db/content-db', () => ({
  getContentDb: async () => ({ collection: () => collection }),
}))
vi.mock('@/server/web-api/progress', () => ({
  defaultTenantId: async () => 'tenant-1',
  idCandidates: (id: string) => [id, new ObjectId(id)],
}))

const storedDocs = (docs: unknown[]) =>
  collection.find.mockReturnValue({ toArray: async () => docs })

describe('learning-state service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns only the requested refs, keyed by kind:key', async () => {
    storedDocs([
      { kind: 'exercise', key: 'ex-1', state: { answers: { b: 1 } } },
      // Same key, other kind: not requested.
      { kind: 'lesson-chat', key: 'ex-1', state: { percent: { percent: 5 } } },
      { kind: 'lesson-chat', key: 'lesson-1', state: { percent: { percent: 40 } } },
    ])

    const states = await findLearningStates(USER_ID, [
      { kind: 'exercise', key: 'ex-1' },
      { kind: 'lesson-chat', key: 'lesson-1' },
    ])

    expect(states).toEqual({
      'exercise:ex-1': { answers: { b: 1 } },
      'lesson-chat:lesson-1': { percent: { percent: 40 } },
    })
  })

  it('skips the query when nothing is requested', async () => {
    expect(await findLearningStates(USER_ID, [])).toEqual({})
    expect(collection.find).not.toHaveBeenCalled()
  })

  it('upserts states and deletes cleared ones, all under the canonical user id', async () => {
    await saveLearningStates(USER_ID, [
      { kind: 'exercise', key: 'ex-1', state: { answers: {} } },
      { kind: 'lesson-chat', key: 'lesson-1', state: null },
    ])

    const [operations] = collection.bulkWrite.mock.calls[0]
    const user = new ObjectId(USER_ID)
    expect(operations).toEqual([
      {
        updateOne: {
          filter: { user, kind: 'exercise', key: 'ex-1' },
          update: {
            $set: { state: { answers: {} }, updatedAt: expect.any(Date) },
            $setOnInsert: { createdAt: expect.any(Date), tenant: 'tenant-1' },
          },
          upsert: true,
        },
      },
      { deleteOne: { filter: { user, kind: 'lesson-chat', key: 'lesson-1' } } },
    ])
  })

  it('lists every state of one kind by key (exam dates per course)', async () => {
    storedDocs([
      { key: 'course-1', state: { exams: [] } },
      { key: 'course-2', state: null },
    ])

    expect(await findLearningStatesByKind(USER_ID, 'exam-dates')).toEqual({
      'course-1': { exams: [] },
    })
    expect(collection.find.mock.calls[0][0]).toMatchObject({ kind: 'exam-dates' })
  })

  it('reads lesson-chat percents for the course page', async () => {
    storedDocs([
      { kind: 'lesson-chat', key: 'lesson-1', state: { percent: { version: 1, percent: 40 } } },
      { kind: 'lesson-chat', key: 'lesson-2', state: { progress: { stepCursor: 3 } } },
    ])

    expect(await findLessonChatPercents(USER_ID, ['lesson-1', 'lesson-2'])).toEqual({
      'lesson-1': 40,
    })
  })
})

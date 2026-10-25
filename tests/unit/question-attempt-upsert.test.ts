import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { updateOne, createIndex } = vi.hoisted(() => ({
  updateOne: vi.fn(),
  createIndex: vi.fn(),
}))

vi.mock('@/infra/db/content-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/infra/db/content-db')>()
  return {
    ...actual,
    getContentDb: async () => ({ collection: () => ({ updateOne, createIndex }) }),
  }
})
vi.mock('@/server/web-api/progress', () => ({
  defaultTenantId: async () => new ObjectId('64b000000000000000000001'),
}))

import { recordQuestionAttempt } from '@/server/services/question-attempts/question-attempt-recorder'
import {
  buildQuestionAttemptWrite,
  type QuestionAttemptEvent,
} from '@/server/services/question-attempts/question-attempt-write'

const USER = '64a000000000000000000001'
const LESSON = '64a000000000000000000002'
const EXERCISE = '64a000000000000000000003'
const TENANT = '64b000000000000000000001'
const NOW = new Date('2026-10-25T10:00:00.000Z')

function write(event: QuestionAttemptEvent) {
  return buildQuestionAttemptWrite(
    {
      userId: USER,
      tenantId: TENANT,
      lessonId: LESSON,
      exerciseId: EXERCISE,
      blockId: 'q1',
      event,
    },
    NOW,
  )
}

describe('buildQuestionAttemptWrite', () => {
  it('keys on (user, exercise, block) with relationships stored as ObjectIds', () => {
    const { filter, update } = write('hint')
    expect(filter).toEqual({
      user: new ObjectId(USER),
      exercise: new ObjectId(EXERCISE),
      block: 'q1',
    })
    expect(update.$setOnInsert.lesson).toEqual(new ObjectId(LESSON))
    expect(update.$setOnInsert.tenant).toEqual(new ObjectId(TENANT))
  })

  it('wrong: $inc wrongCount, seeds the other counters + solved:false, only while unsolved', () => {
    const { filter, update } = write('wrong')
    expect(filter.solved).toEqual({ $ne: true })
    expect(update.$inc).toEqual({ wrongCount: 1 })
    expect(update.$set).toEqual({ updatedAt: NOW })
    expect(update.$setOnInsert).toMatchObject({
      solved: false,
      hintCount: 0,
      explanationCount: 0,
      firstAttemptAt: NOW,
      createdAt: NOW,
    })
    // Same path in $inc and $setOnInsert is a Mongo conflict error.
    expect(update.$setOnInsert).not.toHaveProperty('wrongCount')
  })

  it('correct: sets solved + solvedAt, seeds every counter at 0, no $inc', () => {
    const { filter, update } = write('correct')
    expect(filter.solved).toEqual({ $ne: true })
    expect(update.$inc).toBeUndefined()
    expect(update.$set).toEqual({ updatedAt: NOW, solved: true, solvedAt: NOW })
    expect(update.$setOnInsert).toMatchObject({ wrongCount: 0, hintCount: 0, explanationCount: 0 })
    expect(update.$setOnInsert).not.toHaveProperty('solved')
  })

  it.each([
    ['hint', 'hintCount'],
    ['explanation', 'explanationCount'],
  ] as const)('%s: counts even after solving and does not touch solved', (event, field) => {
    const { filter, update } = write(event)
    expect(filter).not.toHaveProperty('solved')
    expect(update.$inc).toEqual({ [field]: 1 })
    expect(update.$set).toEqual({ updatedAt: NOW })
    expect(update.$setOnInsert).not.toHaveProperty(field)
    expect(update.$setOnInsert.solved).toBe(false)
  })
})

describe('recordQuestionAttempt', () => {
  const input = {
    userId: USER,
    lessonId: LESSON,
    exerciseId: EXERCISE,
    blockId: 'q1',
    event: 'wrong' as const,
  }
  const duplicateKey = Object.assign(new Error('E11000'), { code: 11000 })

  beforeEach(() => {
    updateOne.mockReset()
    createIndex.mockReset().mockResolvedValue('ok')
  })

  // Runs first: the index build is memoized for the life of the process.
  it('creates the unique index, then writes one upsert with the default tenant', async () => {
    updateOne.mockResolvedValue({})
    await expect(recordQuestionAttempt(input, NOW)).resolves.toBe(true)
    expect(createIndex).toHaveBeenCalledWith(
      { user: 1, exercise: 1, block: 1 },
      expect.objectContaining({ unique: true }),
    )
    expect(updateOne).toHaveBeenCalledTimes(1)
    const [, update, options] = updateOne.mock.calls[0]
    expect(options).toEqual({ upsert: true })
    expect(update.$setOnInsert.tenant).toEqual(new ObjectId(TENANT))
  })

  it('retries once after losing a first-insert race', async () => {
    updateOne.mockRejectedValueOnce(duplicateKey).mockResolvedValueOnce({})
    await expect(recordQuestionAttempt(input, NOW)).resolves.toBe(true)
    expect(updateOne).toHaveBeenCalledTimes(2)
  })

  it('is a no-op on an already-solved question (duplicate key twice)', async () => {
    updateOne.mockRejectedValue(duplicateKey)
    await expect(recordQuestionAttempt(input, NOW)).resolves.toBe(false)
    expect(updateOne).toHaveBeenCalledTimes(2)
  })

  it('rejects non-ObjectId lesson / exercise ids without writing', async () => {
    await expect(recordQuestionAttempt({ ...input, exerciseId: 'abc:review' }, NOW)).resolves.toBe(
      false,
    )
    expect(updateOne).not.toHaveBeenCalled()
  })
})

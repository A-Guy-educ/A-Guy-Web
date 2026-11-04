// @vitest-environment jsdom
/**
 * @fileType test
 * @domain client.state
 * @pattern learning-state-sync
 * @ai-summary Pins the learning-state cache contract: the server copy seeds localStorage on lesson load, unsynced local edits beat it, every edit reaches the server tagged with the storage owner, and failures retry instead of losing progress.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  EXERCISE_STATE_PREFIX,
  LESSON_CHAT_KEY_PREFIXES,
  readLocalLearningState,
  writeLocalLearningState,
} from '@/client/state/learningState/learningStateKeys'
import {
  LEARNING_STATE_ENDPOINT,
  PENDING_SYNC_KEY,
  flushLearningState,
  queueLearningStateSync,
  resetLearningStateSyncForTests,
  seedLearningState,
} from '@/client/state/learningState/learningStateSync'
import { STORAGE_OWNER_COOKIE_NAME } from '@/client/state/localStorage/userScopedStorage'
import type { LearningStateRef } from '@/infra/learning-state/refs'

const EXERCISE: LearningStateRef = { kind: 'exercise', key: 'ex-1' }
const CHAT: LearningStateRef = { kind: 'lesson-chat', key: 'lesson-1' }
const SERVER_BUNDLE = { version: 1, answers: { b1: 'server' } }
const LOCAL_BUNDLE = { version: 1, answers: { b1: 'local' } }

const setOwner = (owner: string | null) => {
  document.cookie = owner
    ? `${STORAGE_OWNER_COOKIE_NAME}=${owner}; path=/`
    : `${STORAGE_OWNER_COOKIE_NAME}=; path=/; max-age=0`
}
const setLocalExercise = (bundle: object) =>
  localStorage.setItem(`${EXERCISE_STATE_PREFIX}ex-1`, JSON.stringify(bundle))
const localExercise = () => JSON.parse(localStorage.getItem(`${EXERCISE_STATE_PREFIX}ex-1`)!)
const pendingIds = () => Object.keys(JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) ?? '{}'))
const sentBodies = () =>
  vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)))

describe('learningStateKeys', () => {
  beforeEach(() => localStorage.clear())

  it('folds the four lesson-chat keys into one document and back', () => {
    const state = { progress: { version: 1, stepCursor: 4 }, percent: { percent: 40 } }

    writeLocalLearningState(CHAT, state)

    expect(localStorage.getItem(`${LESSON_CHAT_KEY_PREFIXES.progress}lesson-1`)).toBe(
      JSON.stringify(state.progress),
    )
    expect(localStorage.getItem(`${LESSON_CHAT_KEY_PREFIXES.correct}lesson-1`)).toBeNull()
    expect(readLocalLearningState(CHAT)).toEqual(state)
  })

  it('reads nothing for absent or corrupted entries', () => {
    expect(readLocalLearningState(EXERCISE)).toBeNull()
    localStorage.setItem(`${EXERCISE_STATE_PREFIX}ex-1`, '{not json')
    expect(readLocalLearningState(EXERCISE)).toBeNull()
  })
})

describe('learningStateSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    setOwner('user-a')
    resetLearningStateSyncForTests()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('seedLearningState', () => {
    it('the server copy replaces the local cache', () => {
      setLocalExercise(LOCAL_BUNDLE)

      seedLearningState([EXERCISE], { 'exercise:ex-1': SERVER_BUNDLE })

      expect(localExercise()).toEqual(SERVER_BUNDLE)
      expect(pendingIds()).toEqual([])
    })

    it('an unsynced local edit beats the older server copy and is resent', async () => {
      setLocalExercise(LOCAL_BUNDLE)
      queueLearningStateSync(EXERCISE)
      vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
      await vi.advanceTimersByTimeAsync(1000) // flush fails → stays pending

      seedLearningState([EXERCISE], { 'exercise:ex-1': SERVER_BUNDLE })
      await vi.advanceTimersByTimeAsync(10_000)

      expect(localExercise()).toEqual(LOCAL_BUNDLE)
      expect(sentBodies().at(-1).writes[0].state).toEqual(LOCAL_BUNDLE)
      expect(pendingIds()).toEqual([])
    })

    it('uploads local progress the server has never seen', async () => {
      setLocalExercise(LOCAL_BUNDLE)

      seedLearningState([EXERCISE], {})
      await vi.advanceTimersByTimeAsync(1000)

      expect(sentBodies()).toEqual([
        { ownerId: 'user-a', writes: [{ ...EXERCISE, state: LOCAL_BUNDLE }] },
      ])
    })
  })

  describe('flush', () => {
    it('batches edits made within the flush window into one request', async () => {
      setLocalExercise(LOCAL_BUNDLE)
      queueLearningStateSync(EXERCISE)
      writeLocalLearningState(CHAT, { percent: { percent: 10 } })
      queueLearningStateSync(CHAT)

      await vi.advanceTimersByTimeAsync(1000)

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(vi.mocked(fetch).mock.calls[0][0]).toBe(LEARNING_STATE_ENDPOINT)
      expect(sentBodies()[0].writes).toHaveLength(2)
      expect(pendingIds()).toEqual([])
    })

    it('sends a cleared state as null so the server copy is deleted (lesson Reset)', async () => {
      queueLearningStateSync(EXERCISE)

      await vi.advanceTimersByTimeAsync(1000)

      expect(sentBodies()[0].writes).toEqual([{ ...EXERCISE, state: null }])
    })

    it('drops pending edits for guests — there is no account to save to', async () => {
      setOwner(null)
      setLocalExercise(LOCAL_BUNDLE)
      queueLearningStateSync(EXERCISE)

      await vi.advanceTimersByTimeAsync(1000)

      expect(fetch).not.toHaveBeenCalled()
      expect(pendingIds()).toEqual([])
    })

    it('keeps edits pending after a server error and retries', async () => {
      setLocalExercise(LOCAL_BUNDLE)
      vi.mocked(fetch).mockResolvedValueOnce({ status: 503 } as Response)
      queueLearningStateSync(EXERCISE)

      await vi.advanceTimersByTimeAsync(1000)
      expect(pendingIds()).toEqual(['exercise:ex-1'])

      await vi.advanceTimersByTimeAsync(10_000)
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(pendingIds()).toEqual([])
    })

    it('drops edits the server rejects for good (owner mismatch)', async () => {
      setLocalExercise(LOCAL_BUNDLE)
      vi.mocked(fetch).mockResolvedValueOnce({ status: 409 } as Response)
      queueLearningStateSync(EXERCISE)

      await vi.advanceTimersByTimeAsync(1000)

      expect(pendingIds()).toEqual([])
    })

    it('keeps an edit made while its previous save was in flight', async () => {
      setLocalExercise(LOCAL_BUNDLE)
      let finishRequest: (value: Response) => void = () => {}
      vi.mocked(fetch).mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          finishRequest = resolve
        }),
      )
      queueLearningStateSync(EXERCISE)
      await vi.advanceTimersByTimeAsync(1000) // request now in flight

      queueLearningStateSync(EXERCISE)
      finishRequest({ status: 200 } as Response)
      await vi.advanceTimersByTimeAsync(0)

      expect(pendingIds()).toEqual(['exercise:ex-1'])
    })

    it('flushes with keepalive when the page is hidden', async () => {
      setLocalExercise(LOCAL_BUNDLE)
      queueLearningStateSync(EXERCISE)

      window.dispatchEvent(new Event('pagehide'))
      await vi.advanceTimersByTimeAsync(0)

      expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ keepalive: true })
    })
  })

  it('flushLearningState is a no-op with nothing pending', async () => {
    await flushLearningState()
    expect(fetch).not.toHaveBeenCalled()
  })
})

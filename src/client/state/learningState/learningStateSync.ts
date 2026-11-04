/**
 * Server sync for the learning-state cache. SSR-safe.
 *
 * localStorage stays the synchronous store every lesson component reads; the
 * server (`/api/learning-state`) is the durable copy that follows the student
 * across computers.
 *
 * - Writes: storage writers call `queueLearningStateSync(ref)`. The ref goes on
 *   a persisted pending list and is flushed within FLUSH_DELAY_MS, reading the
 *   state at flush time (absent → server delete). Page hide flushes with
 *   keepalive. Failed flushes stay pending and retry.
 * - Reads: on lesson load `seedLearningState` writes the server copy into
 *   localStorage, except for refs still pending (local is newer). Local state
 *   the server has never seen is uploaded once.
 *
 * Every request names the storage owner; the server refuses it when that is
 * not the signed-in user, so a previous student's pending data can never be
 * saved onto the next student's account.
 */

import { readStorageOwner } from '@/client/state/localStorage/userScopedStorage'
import {
  learningStateId,
  type LearningStateRef,
  type LearningStateValue,
} from '@/infra/learning-state/refs'

import {
  listLocalExamDateKeys,
  readLocalLearningState,
  writeLocalLearningState,
} from './learningStateKeys'

/** User-scoped (wiped on user switch) — listed in USER_SCOPED_KEY_PREFIXES. */
export const PENDING_SYNC_KEY = 'a-guy:learning-state-pending'

export const LEARNING_STATE_ENDPOINT = '/api/learning-state'
const FLUSH_DELAY_MS = 1000
const RETRY_DELAY_MS = 10_000
const MAX_WRITES_PER_REQUEST = 50

type PendingRefs = Record<string, LearningStateRef>

let flushTimer: ReturnType<typeof setTimeout> | null = null
let pageHideBound = false
/** Ids being sent right now, and those edited again while they were. */
let inFlight = new Set<string>()
let editedInFlight = new Set<string>()

function readPending(): PendingRefs {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as PendingRefs) : {}
  } catch {
    return {}
  }
}

function writePending(pending: PendingRefs): void {
  try {
    if (Object.keys(pending).length === 0) localStorage.removeItem(PENDING_SYNC_KEY)
    else localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending))
  } catch {
    // Storage blocked — nothing is cached locally either, so nothing to sync
  }
}

function scheduleFlush(delayMs: number): void {
  bindPageHide()
  if (flushTimer) return // already due; don't let a stream of writes postpone it
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushLearningState()
  }, delayMs)
}

function bindPageHide(): void {
  if (pageHideBound) return
  pageHideBound = true
  const flushNow = () => void flushLearningState({ keepalive: true })
  window.addEventListener('pagehide', flushNow)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow()
  })
}

/** Mark `ref` as changed locally; it reaches the server on the next flush. */
export function queueLearningStateSync(ref: LearningStateRef): void {
  if (typeof window === 'undefined') return
  const id = learningStateId(ref)
  if (inFlight.has(id)) editedInFlight.add(id)
  writePending({ ...readPending(), [id]: ref })
  scheduleFlush(FLUSH_DELAY_MS)
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size),
  )
}

/** Send every pending ref. Refs whose request fails stay pending. */
export async function flushLearningState({ keepalive = false } = {}): Promise<void> {
  if (typeof window === 'undefined') return
  const pending = readPending()
  const refs = Object.values(pending)
  if (refs.length === 0) return

  const ownerId = readStorageOwner()
  if (!ownerId) {
    // Guest (or signed out): there is no account to save to.
    writePending({})
    return
  }

  inFlight = new Set(refs.map(learningStateId))
  editedInFlight = new Set()
  const failed: LearningStateRef[] = []
  for (const batch of chunk(refs, MAX_WRITES_PER_REQUEST)) {
    const writes = batch.map((ref) => ({ ...ref, state: readLocalLearningState(ref) }))
    try {
      const response = await fetch(LEARNING_STATE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive,
        body: JSON.stringify({ ownerId, writes }),
      })
      // 4xx: rejected for good (signed out, owner mismatch, invalid) — drop.
      if (response.status >= 500) failed.push(...batch)
    } catch {
      failed.push(...batch) // offline / aborted
    }
  }

  // Sent refs leave the list, unless they were edited again mid-request.
  const done = [...inFlight].filter((id) => !editedInFlight.has(id))
  inFlight = new Set()
  const stillPending = Object.fromEntries(
    Object.entries(readPending()).filter(([id]) => !done.includes(id)),
  )
  failed.forEach((ref) => {
    stillPending[learningStateId(ref)] = ref
  })
  writePending(stillPending)
  if (Object.keys(stillPending).length > 0) scheduleFlush(RETRY_DELAY_MS)
}

/**
 * Lesson load: make the local cache match the server for `refs`, before any
 * lesson component reads it.
 */
export function seedLearningState(
  refs: LearningStateRef[],
  serverStates: Record<string, LearningStateValue>,
): void {
  if (typeof window === 'undefined') return
  const pending = readPending()
  refs.forEach((ref) => {
    const id = learningStateId(ref)
    if (pending[id]) return // unsynced local edit — newer than the server copy
    const server = serverStates[id]
    if (server) writeLocalLearningState(ref, server)
    else if (readLocalLearningState(ref)) queueLearningStateSync(ref) // never uploaded
  })
  if (Object.keys(pending).length > 0) scheduleFlush(FLUSH_DELAY_MS)
}

/**
 * Sign-in: seed every exam-dates state the server holds (they are shown on
 * many pages, not just one lesson), and upload local ones it has never seen.
 */
export function seedExamDates(serverStatesByCourse: Record<string, LearningStateValue>): void {
  if (typeof window === 'undefined') return
  const courseIds = new Set([...Object.keys(serverStatesByCourse), ...listLocalExamDateKeys()])
  seedLearningState(
    [...courseIds].map((key) => ({ kind: 'exam-dates', key })),
    Object.fromEntries(
      Object.entries(serverStatesByCourse).map(([key, state]) => [
        learningStateId({ kind: 'exam-dates', key }),
        state,
      ]),
    ),
  )
}

/** Test hook: forget timers and listeners between tests. */
export function resetLearningStateSyncForTests(): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  pageHideBound = false
  inFlight = new Set()
  editedInFlight = new Set()
}

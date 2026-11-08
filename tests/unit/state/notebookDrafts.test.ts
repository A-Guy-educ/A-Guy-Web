// @vitest-environment jsdom
/**
 * @fileType test
 * @domain client.state
 * @pattern shared-device
 * @ai-summary Pins the device copy of unsaved notebook work: it round-trips per notebook, survives bad data, reports when the device is full, and is wiped when another student signs in on a shared computer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  NOTEBOOK_DRAFT_KEY_PREFIX,
  readNotebookDrafts,
  removeNotebookDraft,
  writeNotebookDraft,
  type NotebookDraft,
} from '@/client/state/localStorage/notebookDrafts'
import { clearUserScopedStorage } from '@/client/state/localStorage/userScopedStorage'

const draft = (scopeKey = 'lesson:1'): NotebookDraft => ({
  scopeKey,
  strokes: [{ ink: 0, points: [1, 2, 3, 4] }],
  height: 1150,
  baseUpdatedAt: '2026-11-08T10:00:00.000Z',
  editedAt: 1,
})

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('notebook drafts', () => {
  it('returns only the requested notebook', () => {
    writeNotebookDraft('p1', draft('lesson:1'))
    writeNotebookDraft('p2', draft('ask:room'))

    expect([...readNotebookDrafts('lesson:1').keys()]).toEqual(['p1'])
    expect(readNotebookDrafts('ask:room').get('p2')).toEqual(draft('ask:room'))
  })

  it('forgets a draft once removed', () => {
    writeNotebookDraft('p1', draft())
    removeNotebookDraft('p1')

    expect(readNotebookDrafts('lesson:1').size).toBe(0)
  })

  it('drops an unreadable entry instead of failing', () => {
    localStorage.setItem(`${NOTEBOOK_DRAFT_KEY_PREFIX}bad`, '{not json')
    localStorage.setItem(`${NOTEBOOK_DRAFT_KEY_PREFIX}wrong`, JSON.stringify({ strokes: 'no' }))

    expect(readNotebookDrafts('lesson:1').size).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it('reports when the device cannot store the draft', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    expect(writeNotebookDraft('p1', draft())).toBe(false)
  })

  it('is wiped with the rest of a student’s data on a shared computer', () => {
    writeNotebookDraft('p1', draft())

    clearUserScopedStorage()

    expect(readNotebookDrafts('lesson:1').size).toBe(0)
  })
})

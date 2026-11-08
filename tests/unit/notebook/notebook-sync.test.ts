import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NotebookDraft } from '@/client/state/localStorage/notebookDrafts'
import type { NotebookPage } from '@/infra/types/notebook'
import { NotebookRequestError } from '@/ui/web/notebook/LessonNotebook/notebook-api'
import {
  createNotebookSync,
  draftWins,
  mergeDrafts,
  RETRY_MIN_MS,
  SAVE_DELAY_MS,
  type PageSnapshot,
} from '@/ui/web/notebook/LessonNotebook/notebook-sync'

const snap = (marker: number): PageSnapshot => ({
  strokes: [{ ink: 0, points: [marker, marker] }],
  height: 1150,
})

function setup() {
  const drafts = new Map<string, NotebookDraft>()
  const statuses: string[] = []
  const save = vi.fn<(id: string, s: PageSnapshot) => Promise<string>>()
  save.mockResolvedValue('2026-11-08T10:00:00.000Z')
  const env = { online: true, deviceFull: false }
  const sync = createNotebookSync({
    scopeKey: 'lesson:1',
    save,
    writeDraft: (id, draft) => {
      if (env.deviceFull) return false
      drafts.set(id, draft)
      return true
    },
    removeDraft: (id) => void drafts.delete(id),
    isOnline: () => env.online,
    onStatus: (status) => statuses.push(status),
  })
  return { sync, save, drafts, statuses, env, last: () => statuses.at(-1) }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('notebook sync', () => {
  it('stores an edit on the device before anything is sent', () => {
    const { sync, save, drafts } = setup()

    sync.edit('p1', snap(1))

    expect(drafts.get('p1')?.strokes).toEqual(snap(1).strokes)
    expect(save).not.toHaveBeenCalled()
  })

  it('saves after a pause and clears the device copy once the server has it', async () => {
    const { sync, save, drafts, last } = setup()

    sync.edit('p1', snap(1))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS)

    expect(save).toHaveBeenCalledTimes(1)
    expect(drafts.has('p1')).toBe(false)
    expect(last()).toBe('synced')
  })

  it('retries a failed save on its own, without another stroke', async () => {
    const { sync, save, drafts, last } = setup()
    save.mockRejectedValueOnce(new TypeError('network'))

    sync.edit('p1', snap(1))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS)
    expect(last()).toBe('savedLocally')
    expect(drafts.has('p1')).toBe(true)

    await vi.advanceTimersByTimeAsync(RETRY_MIN_MS)

    expect(save).toHaveBeenCalledTimes(2)
    expect(drafts.has('p1')).toBe(false)
    expect(last()).toBe('synced')
  })

  it('holds edits while offline and sends the newest when the connection returns', async () => {
    const { sync, save, env, last } = setup()
    env.online = false

    sync.edit('p1', snap(1))
    sync.edit('p1', snap(2))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(save).not.toHaveBeenCalled()
    expect(last()).toBe('savedLocally')

    env.online = true
    sync.retryNow()
    await vi.advanceTimersByTimeAsync(0)

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('p1', snap(2))
  })

  it('never has two saves of one page in flight, so an old one cannot land last', async () => {
    const { sync, save, drafts } = setup()
    let finishFirst: (value: string) => void = () => {}
    save.mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))

    sync.edit('p1', snap(1))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS)
    sync.edit('p1', snap(2))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS * 3)
    expect(save).toHaveBeenCalledTimes(1)

    finishFirst('2026-11-08T10:00:00.000Z')
    await vi.advanceTimersByTimeAsync(0)
    // The newer edit must survive the older save's success.
    expect(drafts.get('p1')?.strokes).toEqual(snap(2).strokes)

    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith('p1', snap(2))
    expect(drafts.has('p1')).toBe(false)
  })

  it('gives up on a page the server no longer has', async () => {
    const { sync, save, drafts, last } = setup()
    save.mockRejectedValueOnce(new NotebookRequestError(404))

    sync.edit('p1', snap(1))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS + RETRY_MIN_MS * 4)

    expect(save).toHaveBeenCalledTimes(1)
    expect(drafts.has('p1')).toBe(false)
    expect(last()).toBe('synced')
  })

  it('says so when neither the server nor the device has the work', async () => {
    const { sync, save, env, last } = setup()
    env.deviceFull = true
    save.mockRejectedValue(new TypeError('network'))

    sync.edit('p1', snap(1))
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS)

    expect(last()).toBe('unsaved')
  })

  it('leaves unsent work on the device after the notebook closes', async () => {
    const { sync, save, drafts } = setup()
    save.mockRejectedValue(new TypeError('network'))

    sync.edit('p1', snap(1))
    sync.flush()
    sync.dispose()
    await vi.advanceTimersByTimeAsync(RETRY_MIN_MS * 4)

    expect(save).toHaveBeenCalledTimes(1)
    expect(drafts.has('p1')).toBe(true)
  })
})

describe('recovering device drafts', () => {
  const page = (overrides: Partial<NotebookPage> = {}): NotebookPage => ({
    id: 'p1',
    scope: { kind: 'lesson', lessonId: '1' },
    height: 1150,
    cut: null,
    strokes: [],
    createdAt: '2026-11-08T09:00:00.000Z',
    updatedAt: '2026-11-08T10:00:00.000Z',
    ...overrides,
  })
  const draft = (overrides: Partial<NotebookDraft> = {}): NotebookDraft => ({
    scopeKey: 'lesson:1',
    ...snap(1),
    baseUpdatedAt: '2026-11-08T10:00:00.000Z',
    editedAt: Date.parse('2026-11-08T09:59:00.000Z'),
    ...overrides,
  })

  it('trusts the draft when the server has not changed, whatever the device clock says', () => {
    expect(draftWins(page(), draft())).toBe(true)
  })

  it('keeps the most recent edit when the server changed underneath the draft', () => {
    const base = { baseUpdatedAt: '2026-11-08T08:00:00.000Z' }
    expect(
      draftWins(page(), draft({ ...base, editedAt: Date.parse('2026-11-08T11:00:00Z') })),
    ).toBe(true)
    expect(
      draftWins(page(), draft({ ...base, editedAt: Date.parse('2026-11-08T09:00:00Z') })),
    ).toBe(false)
  })

  it('applies a winning draft and queues it for upload', () => {
    const { pages, restored, discard } = mergeDrafts([page()], new Map([['p1', draft()]]))

    expect(pages[0].strokes).toEqual(snap(1).strokes)
    expect(restored).toEqual([{ pageId: 'p1', snapshot: snap(1) }])
    expect(discard).toEqual([])
  })

  it('discards drafts for pages that no longer exist', () => {
    const { pages, restored, discard } = mergeDrafts([], new Map([['gone', draft()]]))

    expect(pages).toEqual([])
    expect(restored).toEqual([])
    expect(discard).toEqual(['gone'])
  })
})

import { useSyncExternalStore } from 'react'

import type { NotebookCut, NotebookPage } from '@/infra/types/notebook'

/**
 * The newest cut in the open notebook, shared from the notebook pane to its
 * sibling chat panel. Module state rather than an event, so the chat still has
 * it after remounting when the layout crosses a breakpoint.
 */
let latestCut: NotebookCut | null = null
const listeners = new Set<() => void>()

export function setLatestCut(cut: NotebookCut | null): void {
  if (cut === latestCut) return
  latestCut = cut
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLatestCut(): NotebookCut | null {
  return useSyncExternalStore(
    subscribe,
    () => latestCut,
    () => null,
  )
}

/** The cut on the most recently created page that has one. */
export function latestCutOf(pages: readonly NotebookPage[]): NotebookCut | null {
  const newest = pages.reduce<NotebookPage | null>(
    (best, page) =>
      page.cut && (!best || Date.parse(page.createdAt) >= Date.parse(best.createdAt)) ? page : best,
    null,
  )
  return newest?.cut ?? null
}

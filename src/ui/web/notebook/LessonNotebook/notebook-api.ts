/**
 * @fileType api-client
 * @domain notebook
 * @ai-summary Browser calls to /api/notebook/pages. Throws on any non-2xx so the notebook hook can surface one save-failed state instead of each caller checking statuses.
 */
import type {
  NotebookPage,
  NotebookPageCreateInput,
  NotebookPageUpdateInput,
  NotebookScope,
} from '@/infra/types/notebook'

const BASE = '/api/notebook/pages'

/** Carries the HTTP status so autosave can tell "gone for good" from "try again". */
export class NotebookRequestError extends Error {
  constructor(readonly status: number) {
    super(`Notebook request failed (${status})`)
  }
}

async function send<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: init.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (!response.ok) throw new NotebookRequestError(response.status)
  return (await response.json()) as T
}

/** The wire form of a scope: exactly one of `lessonId` / `askContext`. */
function scopeParams(scope: NotebookScope): Record<string, string> {
  return scope.kind === 'lesson' ? { lessonId: scope.lessonId } : { askContext: scope.contextKey }
}

export async function fetchNotebookPages(scope: NotebookScope): Promise<NotebookPage[]> {
  const query = new URLSearchParams(scopeParams(scope)).toString()
  const { pages } = await send<{ pages: NotebookPage[] }>(`${BASE}?${query}`)
  return pages
}

export async function createNotebookPage({
  scope,
  ...input
}: NotebookPageCreateInput): Promise<NotebookPage> {
  const { page } = await send<{ page: NotebookPage }>(BASE, {
    method: 'POST',
    body: JSON.stringify({ ...input, ...scopeParams(scope) }),
  })
  return page
}

/** Resolves to the page's new `updatedAt` on the server. */
export async function saveNotebookPage(
  pageId: string,
  update: NotebookPageUpdateInput,
): Promise<string> {
  const { updatedAt } = await send<{ updatedAt: string }>(`${BASE}/${encodeURIComponent(pageId)}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
  return updatedAt
}

export async function deleteNotebookPage(pageId: string): Promise<void> {
  await send(`${BASE}/${encodeURIComponent(pageId)}`, { method: 'DELETE' })
}

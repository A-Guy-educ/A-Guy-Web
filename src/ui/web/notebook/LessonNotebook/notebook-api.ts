/**
 * @fileType api-client
 * @domain notebook
 * @ai-summary Browser calls to /api/notebook/pages. Throws on any non-2xx so the notebook hook can surface one save-failed state instead of each caller checking statuses.
 */
import type {
  NotebookPage,
  NotebookPageCreateInput,
  NotebookPageUpdateInput,
} from '@/infra/types/notebook'

const BASE = '/api/notebook/pages'

async function send<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: init.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (!response.ok) throw new Error(`Notebook request failed (${response.status})`)
  return (await response.json()) as T
}

export async function fetchNotebookPages(lessonId: string): Promise<NotebookPage[]> {
  const { pages } = await send<{ pages: NotebookPage[] }>(
    `${BASE}?lessonId=${encodeURIComponent(lessonId)}`,
  )
  return pages
}

export async function createNotebookPage(input: NotebookPageCreateInput): Promise<NotebookPage> {
  const { page } = await send<{ page: NotebookPage }>(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return page
}

export async function saveNotebookPage(
  pageId: string,
  update: NotebookPageUpdateInput,
): Promise<void> {
  await send(`${BASE}/${encodeURIComponent(pageId)}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
}

export async function deleteNotebookPage(pageId: string): Promise<void> {
  await send(`${BASE}/${encodeURIComponent(pageId)}`, { method: 'DELETE' })
}

/**
 * Notebook Pages Service
 *
 * @fileType service
 * @domain notebook
 * @pattern repository
 * @ai-summary Reads and writes a student's notebook pages. Every query is scoped to the owning user, so a page id alone never reaches another student's work. All `notebook_pages` queries live here; the API routes only translate HTTP.
 */

import { ObjectId, type Db, type Document } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger/logger'
import type {
  NotebookCut,
  NotebookPage,
  NotebookPageCreateInput,
  NotebookPageUpdateInput,
  NotebookStroke,
} from '@/infra/types/notebook'
import { userFilter } from '@/server/web-api/progress'

export const NOTEBOOK_PAGES_COLLECTION = 'notebook_pages'

/** Generous for a single lesson, and stops a runaway client from filling the collection. */
export const MAX_PAGES_PER_LESSON = 200

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? '')
}

function toPage(doc: Document): NotebookPage {
  return {
    id: String(doc._id),
    lessonId: String(doc.lesson),
    height: Number(doc.height),
    cut: (doc.cut as NotebookCut | undefined) ?? null,
    strokes: (doc.strokes as NotebookStroke[] | undefined) ?? [],
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  }
}

/** The caller's page with this id, as a filter — or `null` when the id cannot be a page id. */
function ownPageFilter(userId: string, pageId: string): Document | null {
  if (!ObjectId.isValid(pageId)) return null
  return { _id: new ObjectId(pageId), ...userFilter(userId) }
}

let indexEnsured: Promise<void> | null = null

/** Backs every read here: a student's pages, per lesson, in notebook order. Created once per process. */
function ensureIndex(db: Db): Promise<void> {
  indexEnsured ??= Promise.resolve()
    .then(() =>
      db
        .collection(NOTEBOOK_PAGES_COLLECTION)
        .createIndex({ user: 1, lesson: 1, createdAt: 1 }, { name: 'notebook_pages_user_lesson' }),
    )
    .then(() => undefined)
    .catch((err: unknown) => {
      indexEnsured = null
      logger.warn({ err }, 'Failed to ensure notebook_pages index — will retry on next request')
    })
  return indexEnsured
}

/** A student's pages for one lesson, oldest first — the order they were added to the notebook. */
export async function listNotebookPages(userId: string, lessonId: string): Promise<NotebookPage[]> {
  const db = await getContentDb()
  await ensureIndex(db)
  const docs = await db
    .collection(NOTEBOOK_PAGES_COLLECTION)
    .find({ ...userFilter(userId), lesson: lessonId })
    .sort({ createdAt: 1 })
    .toArray()
  return docs.map(toPage)
}

export type CreateNotebookPageResult =
  { ok: true; page: NotebookPage } | { ok: false; reason: 'page_limit' }

export async function createNotebookPage(
  userId: string,
  input: NotebookPageCreateInput,
): Promise<CreateNotebookPageResult> {
  const db = await getContentDb()
  const collection = db.collection(NOTEBOOK_PAGES_COLLECTION)

  const existing = await collection.countDocuments({
    ...userFilter(userId),
    lesson: input.lessonId,
  })
  if (existing >= MAX_PAGES_PER_LESSON) return { ok: false, reason: 'page_limit' }

  const now = new Date()
  const doc = {
    _id: new ObjectId(),
    user: ObjectId.isValid(userId) ? new ObjectId(userId) : userId,
    lesson: input.lessonId,
    height: input.height,
    cut: input.cut ?? null,
    strokes: [],
    createdAt: now,
    updatedAt: now,
  }
  await collection.insertOne(doc)
  return { ok: true, page: toPage(doc) }
}

/**
 * Replace a page's strokes and/or height. Returns `false` when the page does
 * not exist or belongs to someone else — the caller cannot tell which, on purpose.
 */
export async function updateNotebookPage(
  userId: string,
  pageId: string,
  update: NotebookPageUpdateInput,
): Promise<boolean> {
  const filter = ownPageFilter(userId, pageId)
  if (!filter) return false

  const set: Document = { updatedAt: new Date() }
  if (update.height !== undefined) set.height = update.height
  if (update.strokes !== undefined) set.strokes = update.strokes

  const db = await getContentDb()
  const result = await db.collection(NOTEBOOK_PAGES_COLLECTION).updateOne(filter, { $set: set })
  return result.matchedCount > 0
}

/** Delete one of the caller's pages. Returns `false` when there was nothing of theirs to delete. */
export async function deleteNotebookPage(userId: string, pageId: string): Promise<boolean> {
  const filter = ownPageFilter(userId, pageId)
  if (!filter) return false

  const db = await getContentDb()
  const result = await db.collection(NOTEBOOK_PAGES_COLLECTION).deleteOne(filter)
  return result.deletedCount > 0
}

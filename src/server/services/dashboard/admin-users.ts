/**
 * Loads admin user ids so dashboard aggregations can filter them out at
 * read time. Mirrors the shape used by product-health/eligible-users.ts:
 * the same user relationship is written as both an ObjectId and its
 * string form across our history (see progress.ts `userFilter`), so
 * `$nin` matches need to carry both encodings.
 *
 * `stringIds` is returned separately for llm-usage, which stores
 * `userId` as a plain string (llm-usage.ts writes `userId: input.userId`).
 */

import { ObjectId, type Db } from 'mongodb'

export interface AdminUserRefs {
  /** For $nin against fields written as ObjectId-or-string. */
  refs: unknown[]
  /** For $nin against string-only user id fields (llm-usage.userId). */
  stringIds: string[]
}

export async function fetchAdminUserRefs(db: Db): Promise<AdminUserRefs> {
  const rows = await db
    .collection('users')
    .find({ role: 'admin' }, { projection: { _id: 1 } })
    .toArray()

  const refs: unknown[] = []
  const stringIds: string[] = []
  for (const row of rows) {
    const idStr = String(row._id)
    stringIds.push(idStr)
    if (row._id instanceof ObjectId) {
      refs.push(row._id, idStr)
    } else if (ObjectId.isValid(idStr)) {
      refs.push(new ObjectId(idStr), idStr)
    } else {
      refs.push(idStr)
    }
  }
  return { refs, stringIds }
}

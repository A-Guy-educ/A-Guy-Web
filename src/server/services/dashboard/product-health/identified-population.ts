/**
 * Identified-user population fetch — spec §2 "All Identified Users".
 *
 * Rules:
 *  - `role !== 'admin'` (aligned with §9 exclusion decision)
 *  - `email` present (Google OAuth without email is currently impossible
 *    but we still gate on the identifier the spec calls out)
 *  - `createdAt <= signal_end` (per-bucket denominator uses this)
 *  - Optional `currentCourse` filter when courseId is set (see
 *    course-filter.ts for the caveat)
 */

import { type Db } from 'mongodb'

import { courseUserFilter } from './course-filter'
import type { IdentifiedPopulation, SignalSpan } from './signal-types'

interface UserRow {
  _id: unknown
  createdAt?: Date
}

export async function fetchIdentifiedPopulation(
  db: Db,
  span: SignalSpan,
  courseId: string | null,
): Promise<IdentifiedPopulation> {
  const scope = await courseUserFilter(db, courseId)
  const match: Record<string, unknown> = {
    role: { $ne: 'admin' },
    email: { $exists: true, $ne: '' },
    createdAt: { $lte: span.end },
  }
  if (scope) match._id = scope

  const rows = (await db
    .collection('users')
    .find(match, { projection: { _id: 1, createdAt: 1 } })
    .toArray()) as UserRow[]

  const createdAt = new Map<string, Date>()
  for (const row of rows) {
    const id = String(row._id)
    createdAt.set(id, row.createdAt ?? span.start)
  }
  return { createdAt }
}

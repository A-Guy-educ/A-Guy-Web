/**
 * Resolves the pool of users a single Product Health request measures.
 *
 * Applies the §9 decisions Shai locked in:
 *   - Exclude `role='admin'`.
 *   - Exclude any user whose email ends in a domain from
 *     `PRODUCT_HEALTH_EXCLUDED_DOMAINS` (comma-separated env var,
 *     defaults to `aguy.co.il` so our own testing doesn't skew numbers).
 *   - When `courseId` is set, restrict to accounts whose `currentCourse`
 *     currently matches.
 *
 * courseId is an attribution *snapshot only* — users who switched courses
 * will retroactively count under the current one for historical buckets.
 * Fix requires a per-course activity log (out of scope for v1).
 *
 * Returned `refs` is a flat list of userId ObjectIds *and* their string
 * form so signal queries can `$in`-match against `user-progresses.user`
 * regardless of which encoding the record used at write time (see
 * progress.ts — the write path emits both shapes over its lifetime).
 */

import { ObjectId, type Db } from 'mongodb'

import type { SignalSpan } from './signal-types'

const DEFAULT_EXCLUDED_DOMAINS = 'aguy.co.il'

export interface EligibleUsers {
  createdAt: Map<string, Date>
  refs: unknown[]
}

interface UserRow {
  _id: unknown
  createdAt?: Date
}

function excludedDomains(): string[] {
  const raw = process.env.PRODUCT_HEALTH_EXCLUDED_DOMAINS ?? DEFAULT_EXCLUDED_DOMAINS
  return raw
    .split(',')
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function excludedEmailRegex(): RegExp | null {
  const domains = excludedDomains()
  if (domains.length === 0) return null
  const alternation = domains.map(escapeRegex).join('|')
  return new RegExp(`@(?:${alternation})$`, 'i')
}

export async function fetchEligibleUsers(
  db: Db,
  span: SignalSpan,
  courseId: string | null,
): Promise<EligibleUsers> {
  const match: Record<string, unknown> = {
    role: { $ne: 'admin' },
    email: { $exists: true, $ne: '' },
    createdAt: { $lte: span.end },
  }
  const excludeRegex = excludedEmailRegex()
  if (excludeRegex) match.email = { $exists: true, $ne: '', $not: excludeRegex }
  if (courseId) {
    match.currentCourse = ObjectId.isValid(courseId) ? new ObjectId(courseId) : courseId
  }

  const rows = (await db
    .collection('users')
    .find(match, { projection: { _id: 1, createdAt: 1 } })
    .toArray()) as UserRow[]

  const createdAt = new Map<string, Date>()
  const refs: unknown[] = []
  for (const row of rows) {
    const idStr = String(row._id)
    createdAt.set(idStr, row.createdAt ?? span.start)
    if (ObjectId.isValid(idStr)) {
      refs.push(row._id as ObjectId, idStr)
    } else {
      refs.push(idStr)
    }
  }
  return { createdAt, refs }
}

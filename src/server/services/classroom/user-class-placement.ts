/**
 * The class and school a user belongs to, read from the Admin-owned `classes`
 * rosters. Membership lives only on the class, so there is nothing to read off
 * the user. Roster ids may be stored as ObjectId or string, hence `idCandidates`.
 *
 * @fileType service
 * @domain classroom
 * @pattern service
 * @ai-summary Resolves the display names of a user's classes and schools from the class rosters; null when the user is on none
 */

import type { Document } from 'mongodb'

import { getContentDb, relationId } from '@/infra/db/content-db'
import { idCandidates } from '@/server/web-api/progress'

const SCHOOLS_COLLECTION = 'schools'
const CLASSES_COLLECTION = 'classes'

export interface UserClassPlacement {
  className: string | null
  schoolName: string | null
}

/** Distinct non-empty names as one display string; null when there are none. */
function joinNames(docs: Document[]): string | null {
  const names = docs
    .map((doc) => doc.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
  return names.length > 0 ? [...new Set(names)].join(', ') : null
}

export async function getUserClassPlacement(userId: string): Promise<UserClassPlacement> {
  const refs = idCandidates(userId)
  const db = await getContentDb()
  const classes = await db
    .collection(CLASSES_COLLECTION)
    .find(
      { $or: [{ students: { $in: refs } }, { teachers: { $in: refs } }] },
      { projection: { name: 1, school: 1 } },
    )
    .toArray()
  if (classes.length === 0) return { className: null, schoolName: null }

  const schoolIds = classes.map((c) => relationId(c.school)).filter((id) => id !== null)
  const schools = await db
    .collection(SCHOOLS_COLLECTION)
    .find({ _id: { $in: schoolIds.flatMap(idCandidates) } } as Document, {
      projection: { name: 1 },
    })
    .toArray()

  return { className: joinNames(classes), schoolName: joinNames(schools) }
}

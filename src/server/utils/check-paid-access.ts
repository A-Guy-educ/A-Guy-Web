import { ObjectId, type Document } from 'mongodb'

import { getContentDb, relationId } from '@/infra/db/content-db'
import { idCandidates } from '@/server/web-api/progress'
import { getAuthenticatedUserServer } from './access-gate-server'

interface PaidAccessResult {
  requiresEntitlement: boolean
  isAuthenticated: boolean
}

export async function checkPaidAccess(courseId: string): Promise<PaidAccessResult> {
  const { user } = await getAuthenticatedUserServer()
  if (!user?.id) return { requiresEntitlement: true, isAuthenticated: false }
  if (user.role === 'admin' || user.roles?.includes('admin')) {
    return { requiresEntitlement: false, isAuthenticated: true }
  }

  const db = await getContentDb()
  const userIds = idCandidates(user.id)
  const courseIds = idCandidates(courseId)
  const [entitlement, enrollment, userDoc] = await Promise.all([
    db.collection('user-entitlements').findOne({
      user: { $in: userIds },
      course: { $in: courseIds },
    }),
    db.collection('enrollments').findOne({
      user: { $in: userIds },
      course: { $in: courseIds },
      status: { $ne: 'cancelled' },
    }),
    db
      .collection('users')
      .findOne({ _id: ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id } as Document),
  ])
  const legacy = Array.isArray(userDoc?.courseEntitlements)
    ? userDoc.courseEntitlements.some((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return false
        return relationId((entry as { course?: unknown }).course) === courseId
      })
    : false

  return { requiresEntitlement: !(entitlement || enrollment || legacy), isAuthenticated: true }
}

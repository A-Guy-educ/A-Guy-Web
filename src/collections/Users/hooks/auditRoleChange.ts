import type { CollectionAfterChangeHook } from 'payload'
import { logger } from '@/utilities/logger'

/**
 * afterChange hook that logs role changes for audit trail
 * Logs when a user's role is promoted to admin or demoted to student
 */
export const auditRoleChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
  previousDoc,
}) => {
  // Only audit on update operations
  if (operation !== 'update') return doc

  // Check if role changed
  const oldRole = previousDoc?.role
  const newRole = doc.role

  if (oldRole !== newRole) {
    const requestId = crypto.randomUUID()
    const changedBy = req.user?.id || 'system'
    const changedByEmail = req.user?.email || 'system'

    logger.info(
      {
        requestId,
        action: 'user_role_change',
        userId: doc.id,
        userEmail: doc.email,
        oldRole,
        newRole,
        changedBy,
        changedByEmail,
        timestamp: new Date().toISOString(),
      },
      `User role changed: ${doc.email} from ${oldRole} to ${newRole} by ${changedByEmail}`,
    )
  }

  return doc
}

import type { Access } from 'payload'

import { Role, type User } from '@/collections/Users/roles'

/**
 * Access control that allows admins to access all records,
 * or users to access their own record (query constraint)
 */
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false

  // Type assertion since Payload types user as generated User
  const typedUser = user as User

  // Admins can access all records
  if (typedUser.role === Role.Admin) return true

  // Users can only access their own record
  return {
    id: { equals: typedUser.id },
  }
}

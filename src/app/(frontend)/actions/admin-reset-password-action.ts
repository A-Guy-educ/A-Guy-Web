'use server'

export interface AdminResetPasswordInput {
  adminUserId: string
  targetUserEmail: string
  newPassword: string
}

export type AdminResetPasswordError =
  | 'invalid_input'
  | 'forbidden'
  | 'user_not_found'
  | 'weak_password'
  | 'unexpected_error'

export interface AdminResetPasswordResult {
  success: boolean
  error?: AdminResetPasswordError
}

export async function adminResetUserPassword(
  _input: AdminResetPasswordInput,
): Promise<AdminResetPasswordResult> {
  return { success: false, error: 'forbidden' }
}

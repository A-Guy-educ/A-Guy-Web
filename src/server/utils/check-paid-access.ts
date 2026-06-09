interface PaidAccessResult {
  requiresEntitlement: boolean
  isAuthenticated: boolean
}

export async function checkPaidAccess(_courseId: string): Promise<PaidAccessResult> {
  return { requiresEntitlement: true, isAuthenticated: false }
}

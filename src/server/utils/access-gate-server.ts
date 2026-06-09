interface AuthResult {
  user: { id: string; role: string } | null
  payload: null
}

export async function getAuthenticatedUserServer(): Promise<AuthResult> {
  return { user: null, payload: null }
}

export async function isAuthenticatedServer(): Promise<boolean> {
  return false
}

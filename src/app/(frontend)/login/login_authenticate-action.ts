'use server'

type CookieStore = {
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean
      secure: boolean
      sameSite: 'lax' | 'strict' | 'none'
      path: string
      maxAge: number
    },
  ) => void
  delete: (name: string, options?: { path: string }) => void
}

export async function loginAction(_formData: FormData, _cookieStore?: CookieStore) {
  return { success: false, error: 'invalidCredentials' }
}

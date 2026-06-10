'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'

import { loginWithPassword } from '@/infra/auth/web-auth'
import { logger } from '@/infra/utils/logger'

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
  const parsed = z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
    })
    .safeParse({
      email: _formData.get('email'),
      password: _formData.get('password'),
    })

  if (!parsed.success) return { success: false, error: 'invalidCredentials' }

  try {
    const session = await loginWithPassword(parsed.data.email, parsed.data.password)
    if (!session) return { success: false, error: 'invalidCredentials' }
    const store = _cookieStore ?? (await cookies())
    store.set('payload-token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return { success: true }
  } catch (error) {
    logger.error({ err: error }, 'Login failed')
    return { success: false, error: 'invalidCredentials' }
  }
}

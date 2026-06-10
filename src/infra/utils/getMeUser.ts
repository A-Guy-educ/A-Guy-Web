import { redirect } from 'next/navigation'

import { AUTH_COOKIE_NAME, getSessionFromToken } from '@/infra/auth/web-auth'
import type { User } from '@/infra/types/content'

export const getMeUser = async (args?: {
  nullUserRedirect?: string
  validUserRedirect?: string
}): Promise<{
  token: string | null
  user: User | null
}> => {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null
  const session = await getSessionFromToken(token)
  const user = session?.user ?? null

  if (!user && args?.nullUserRedirect) {
    redirect(args.nullUserRedirect)
  }

  if (user && args?.validUserRedirect) {
    redirect(args.validUserRedirect)
  }

  return {
    token: session?.token ?? null,
    user,
  }
}

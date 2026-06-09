import { redirect } from 'next/navigation'

import type { User } from '@/infra/types/content'

export const getMeUser = async (args?: {
  nullUserRedirect?: string
  validUserRedirect?: string
}): Promise<{
  token: string | null
  user: User | null
}> => {
  if (args?.nullUserRedirect) {
    redirect(args.nullUserRedirect)
  }

  return {
    token: null,
    user: null,
  }
}

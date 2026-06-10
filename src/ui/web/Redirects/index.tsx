import type React from 'react'

import { getCachedRedirects } from '@/infra/utils/getRedirects'
import { isInternalPath, normalizePath } from '@/infra/utils/path-utils'
import { notFound, redirect } from 'next/navigation'

interface Props {
  disableNotFound?: boolean
  url: string
}

export const Redirects: React.FC<Props> = async ({ disableNotFound, url }) => {
  const redirects = await getCachedRedirects()()
  const normalizedUrl = normalizePath(url)

  const redirectItem = redirects.find((item) => normalizePath(item.from || '') === normalizedUrl)

  const targetUrl = redirectItem?.to?.url
  if (targetUrl && isInternalPath(targetUrl) && normalizePath(targetUrl) !== normalizedUrl) {
    redirect(targetUrl)
  }

  if (disableNotFound) return null

  notFound()
}

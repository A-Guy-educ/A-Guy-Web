import { getAppVersion } from '@/infra/utils/getAppVersion'

import { FooterClient } from './FooterClient'

export async function Footer() {
  const version = await getAppVersion()
  return <FooterClient version={version} />
}

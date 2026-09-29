import { getSystemLocale } from '@/i18n/server-locale'
import { getAppVersion } from '@/infra/utils/getAppVersion'

import { FooterClient } from './FooterClient'
import { loadFooterData } from './footer-data'

export async function Footer() {
  const locale = await getSystemLocale()
  const [data, version] = await Promise.all([loadFooterData(locale), getAppVersion()])

  return <FooterClient data={data} version={version} />
}

/**
 * Subscription Smoke-Test Page — /subtest
 *
 * One card at 1 ILS that goes through the Tranzilla checkout → admin webhook →
 * user-doc update flow, so we can validate the plumbing without paying the
 * real tier price. Delete this route (and `/api/subscriptions/test-checkout`)
 * once the full subscription flow is live and tested.
 *
 * @fileType page
 * @domain billing
 */

import { getDirection } from '@/i18n/config'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { SubTestCard } from './_components/SubTestCard'

export const dynamic = 'force-dynamic'

export default async function SubTestPage() {
  const locale = await getSystemLocale()

  return (
    <div
      className="min-h-screen bg-background text-card-foreground antialiased"
      dir={getDirection(locale)}
    >
      <div className="mx-auto max-w-xl px-6 py-section-md">
        <SubTestCard />
      </div>
    </div>
  )
}

export async function generateMetadata() {
  const locale = await getSystemLocale()
  const isHebrew = locale === 'he'

  return pageMetadata({
    title: isHebrew ? 'בדיקת מנוי' : 'Subscription test',
    description: isHebrew ? 'עמוד בדיקה למנוי בשקל אחד' : '1 ILS subscription smoke test',
  })
}

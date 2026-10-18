/**
 * Subscriptions Catalog Page
 *
 * Four hardcoded tier cards (free / basic / advanced / premium) sourced from
 * `src/lib/tiers/constants.ts`. Paid tiers trigger a PayPal order via
 * `/api/subscriptions/checkout`; the webhook applies `currentTier` +
 * `llmTokensLimit` to the user on capture.
 *
 * @fileType page
 * @domain billing
 */

import { getDirection } from '@/i18n/config'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { TIER_SLUGS } from '@/lib/tiers/constants'
import { ComingSoonSection } from './_components/ComingSoonSection'
import { SubscriptionsHeader } from './_components/SubscriptionsHeader'
import { TierCard } from './_components/TierCard'

export const dynamic = 'force-dynamic'

export default async function SubscriptionsPage() {
  const locale = await getSystemLocale()

  return (
    <div className="min-h-screen text-card-foreground antialiased" dir={getDirection(locale)}>
      <SubscriptionsHeader />

      <div className="max-w-6xl mx-auto px-6 py-section-md">
        <div className="grid gap-content-gap md:grid-cols-2 xl:grid-cols-4">
          {TIER_SLUGS.map((tier) => (
            <TierCard key={tier} tier={tier} />
          ))}
        </div>
        <ComingSoonSection />
      </div>
    </div>
  )
}

export async function generateMetadata() {
  const locale = await getSystemLocale()
  const isHebrew = locale === 'he'

  return pageMetadata({
    title: isHebrew ? 'מסלולי מנוי' : 'Subscription plans',
    description: isHebrew ? 'בחרו את המסלול שמתאים לכם' : 'Choose the plan that fits you',
  })
}

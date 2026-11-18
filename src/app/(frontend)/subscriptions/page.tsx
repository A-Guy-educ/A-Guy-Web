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
import { RETURN_TO_PARAM, sanitizeSubscribeReturnTo } from '@/lib/tiers/subscribe-return'
import { recordFunnelEvent } from '@/server/services/funnel-events'
import { getAuthenticatedUserServer } from '@/server/utils/access-gate-server'
import { ComingSoonSection } from './_components/ComingSoonSection'
import { SubscriptionsCatalog } from './_components/SubscriptionsCatalog'
import { SubscriptionsHeader } from './_components/SubscriptionsHeader'

export const dynamic = 'force-dynamic'

interface SubscriptionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const [locale, { user }, params] = await Promise.all([
    getSystemLocale(),
    getAuthenticatedUserServer(),
    searchParams,
  ])
  const rawReturnTo = params[RETURN_TO_PARAM]
  await recordFunnelEvent({
    type: 'pricing_viewed',
    userId: user?.id ? String(user.id) : null,
    returnTo: sanitizeSubscribeReturnTo(Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo),
  })

  return (
    <div className="min-h-screen text-card-foreground antialiased" dir={getDirection(locale)}>
      <SubscriptionsHeader />

      <div className="max-w-6xl mx-auto px-6 py-section-md">
        <SubscriptionsCatalog tiers={TIER_SLUGS} />
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

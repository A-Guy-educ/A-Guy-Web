/**
 * Checkout Success Page
 *
 * Displays payment confirmation after Stripe/PayPal redirects back from checkout.
 * Fetches the transaction by session ID (providerTransactionId) and shows:
 * - Confirmed: Payment received, access granted
 * - Pending: Payment received, processing access (webhook timing)
 *
 * @fileType page
 * @domain billing
 */

import { getDirection } from '@/i18n/config'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import type { Metadata } from 'next'
import { CheckoutSuccessContent } from './CheckoutSuccessContent'

type Props = {
  searchParams: Promise<{ session_id?: string; token?: string; provider?: string }>
}

export async function generateMetadata({
  searchParams: _searchParamsPromise,
}: Props): Promise<Metadata> {
  const locale = await getSystemLocale()
  const isHebrew = locale === 'he'

  return pageMetadata({
    title: isHebrew ? 'תשלום הושלם' : 'Payment Confirmed',
    description: isHebrew ? 'התשלום הושלם בהצלחה' : 'Your payment was successfully processed',
  })
}

export default async function CheckoutSuccessPage({ searchParams: searchParamsPromise }: Props) {
  const { session_id, token } = await searchParamsPromise
  const lookupId = session_id ?? token
  const locale = await getSystemLocale()

  return (
    <div
      className="min-h-screen text-card-foreground antialiased flex items-center justify-center"
      dir={getDirection(locale)}
    >
      <CheckoutSuccessContent sessionId={lookupId} transaction={null} productName="" />
    </div>
  )
}

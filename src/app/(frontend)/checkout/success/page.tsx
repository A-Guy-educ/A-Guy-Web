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
import { capturePayPalOrder } from '@/lib/payment/paypal'
import {
  queryTransactionById,
  queryTransactionByProviderId,
} from '@/server/repos/queries/transactions'
import type { Metadata } from 'next'
import { CheckoutSuccessContent } from './CheckoutSuccessContent'

// The lookup is keyed on cookies-bearing request data and reads from Mongo at
// request time. Force-dynamic so Next.js doesn't try to pre-render it.
export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{
    session_id?: string
    token?: string
    subscription_id?: string
    ba_token?: string
    provider?: string
    tranzilla_tx?: string
  }>
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
  // Provider-return query params map to our stored providerTransactionId:
  //   • Stripe            → session_id
  //   • PayPal Orders     → token           (the order id — CAPTURE flow)
  //   • PayPal Subs       → subscription_id (the I-XXX sub id; ba_token/token
  //                         also present but are approval tokens, not our ids)
  //
  // Prefer subscription_id when present — otherwise a PayPal-sub return URL
  // like ?subscription_id=I-...&token=61R... would be looked up by the token,
  // hit no row, and leave the buyer stuck on the pending screen forever even
  // though the sub is already Active in Mongo.
  const { session_id, token, subscription_id, tranzilla_tx } = await searchParamsPromise
  // Tranzilla's real `index` is not on the row until Admin's webhook replaces
  // the placeholder, so for that provider we look up by the Payload row _id
  // that we baked into the success URL at checkout-create time.
  const lookupId = session_id ?? subscription_id ?? token
  const tranzillaTxId =
    typeof tranzilla_tx === 'string' && tranzilla_tx.length > 0 ? tranzilla_tx : null

  // PayPal orders are created with intent: 'CAPTURE', which does NOT auto-capture
  // on buyer approval — someone has to POST /v2/checkout/orders/{token}/capture
  // for money to actually move (and for PAYMENT.CAPTURE.COMPLETED to fire, which
  // is what admin's webhook keys off to write the enrollment). PayPal's redirect
  // back to /checkout/success is the trigger; the buyer is here, the order token
  // is in the URL, so we call capture from the server component before rendering.
  //
  // Skip capture for the subscription return path — subscription approval flows
  // don't have an equivalent "capture" step; the buyer's approval alone triggers
  // BILLING.SUBSCRIPTION.ACTIVATED → PAYMENT.SALE.COMPLETED which admin's webhook
  // handler consumes to flip the transaction to succeeded. Calling capture on a
  // sub's approval token would 404 at PayPal.
  //
  // capturePayPalOrder is idempotent — ORDER_ALREADY_CAPTURED is treated as a
  // benign no-op — so buyer reloads and PayPal's own retry on the return URL are
  // both safe. Errors are logged but do NOT block rendering: the buyer still sees
  // the Pending state, the entitlement poll runs, and the manual refresh button
  // remains as an escape. Blocking here would trap someone who paid successfully
  // behind a page crash if PayPal's API had a transient issue at capture time.
  // Only attempt PayPal capture when we have a token AND we're NOT on a
  // Tranzilla return path. Tranzilla also appends its own query params to the
  // success URL, which could coincidentally include a `token`-shaped param on
  // some gateway flows — the tranzilla_tx guard keeps us from firing a PayPal
  // capture call that would 404 against PayPal's API.
  if (token && !subscription_id && !tranzillaTxId) {
    try {
      await capturePayPalOrder(token)
    } catch (error) {
      console.error('PayPal capture failed on /checkout/success return', {
        orderId: token,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const [locale, transaction] = await Promise.all([
    getSystemLocale(),
    tranzillaTxId
      ? queryTransactionById(tranzillaTxId)
      : lookupId
        ? queryTransactionByProviderId(lookupId)
        : Promise.resolve(null),
  ])

  return (
    <div
      className="min-h-screen text-card-foreground antialiased flex items-center justify-center"
      dir={getDirection(locale)}
    >
      <CheckoutSuccessContent
        sessionId={lookupId ?? tranzillaTxId ?? undefined}
        transaction={
          transaction
            ? {
                id: transaction.id,
                status: transaction.status,
                entitlementsGrantedAt: transaction.entitlementsGrantedAt,
              }
            : null
        }
        productName={transaction?.productName ?? ''}
        firstCourse={transaction?.firstCourse ?? null}
      />
    </div>
  )
}

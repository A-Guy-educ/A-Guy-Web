/**
 * Tranzilla Hosted Checkout — URL builder
 *
 * Builds the `direct.tranzila.com/<terminal>/iframenew.php?...` URL the buyer
 * is redirected to. Web does not call any Tranzilla server-side API — the
 * capture notification is handled by the Admin app's `/api/webhooks/tranzilla`
 * handler, which owns the webhook verification secrets.
 *
 * Reference payload shape documented by Admin PRs A-Guy-Admin#586 / #603.
 *
 * @fileType utility
 * @domain payment
 */

import { randomUUID } from 'crypto'

import { getTranzillaEnv } from './env'
import type { CheckoutResult, CreateCheckoutOptions } from './types'

const TRANZILLA_CURRENCY_CODE: Record<string, string> = {
  ILS: '1',
  USD: '2',
  EUR: '978',
  GBP: '826',
}

export interface CreateTranzillaCheckoutOptions extends CreateCheckoutOptions {
  /** Payload transactions row _id. Round-trips as `u72` for webhook correlation. */
  transactionRowId: string
  /** 'he' for Hebrew UI, 'en' for English. */
  locale?: 'he' | 'en'
}

/**
 * Build the hosted-checkout URL and return the pending `providerTransactionId`
 * placeholder. The placeholder gets persisted on the transactions row and is
 * replaced with the real Tranzilla `index` by Admin's webhook when the
 * capture notification arrives.
 */
export function createTranzillaCheckout(options: CreateTranzillaCheckoutOptions): CheckoutResult {
  const {
    productId,
    productName,
    amount,
    currency,
    userId,
    successUrl,
    cancelUrl,
    transactionRowId,
    locale,
  } = options

  const currencyCode = TRANZILLA_CURRENCY_CODE[currency.toUpperCase()]
  if (!currencyCode) {
    throw new Error(`Tranzilla: unsupported currency "${currency}"`)
  }

  const { tranzillaTerminal, tranzillaNotifyUrl } = getTranzillaEnv()

  // Placeholder providerTransactionId: Admin's schema has `providerTransactionId`
  // unique, and we don't learn the real Tranzilla `index` until the webhook
  // fires. UUID prefix keeps the row inspectable in the Admin UI before capture.
  const providerSessionId = `tranzilla-pending-${randomUUID()}`

  const params = new URLSearchParams({
    sum: (amount / 100).toFixed(2),
    currency: currencyCode,
    cred_type: '1',
    tranmode: 'A',
    pdesc: productName,
    success_url_address: successUrl,
    fail_url_address: cancelUrl,
    notify_url_address: tranzillaNotifyUrl,
    lang: locale === 'en' ? 'us' : 'il',
    nologo: '1',
    u71: userId,
    u72: transactionRowId,
    u73: productId,
  })

  const checkoutUrl = `https://direct.tranzila.com/${encodeURIComponent(
    tranzillaTerminal,
  )}/iframenew.php?${params.toString()}`

  return { checkoutUrl, providerSessionId }
}

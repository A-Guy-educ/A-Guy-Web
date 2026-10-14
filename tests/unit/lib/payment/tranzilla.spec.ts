/**
 * Unit Tests for Tranzilla Hosted-Checkout URL Builder
 *
 * The URL this helper returns is literally what the buyer's browser gets
 * redirected to. If a required field drifts (currency code, u71/u72/u73,
 * notify_url_address pointing at Web instead of Admin) the webhook can't
 * correlate the capture and the user's purchase stays stuck pending forever.
 * These tests pin down every param that cannot regress silently.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MissingPaymentEnvError, resetPaymentEnvCache } from '@/lib/payment/env'
import { createTranzillaCheckout } from '@/lib/payment/tranzilla'

const BASE_OPTIONS = {
  productId: 'prod-123',
  productName: 'Test Product',
  amount: 2990, // 29.90 in agorot
  currency: 'ILS',
  userId: 'user-abc',
  successUrl: 'https://web.example/checkout/success?tranzilla_tx=row-1',
  cancelUrl: 'https://web.example/checkout/cancel?product_id=prod-123',
  transactionRowId: 'row-1',
}

describe('createTranzillaCheckout', () => {
  beforeEach(() => {
    resetPaymentEnvCache()
    process.env.TRANZILLA_TERMINAL = 'fxpaguy'
    process.env.TRANZILLA_NOTIFY_URL = 'https://admin.example/api/webhooks/tranzilla'
  })

  afterEach(() => {
    resetPaymentEnvCache()
    delete process.env.TRANZILLA_TERMINAL
    delete process.env.TRANZILLA_NOTIFY_URL
    vi.restoreAllMocks()
  })

  it('builds a direct.tranzila.com URL against the configured terminal', () => {
    const { checkoutUrl } = createTranzillaCheckout(BASE_OPTIONS)
    expect(checkoutUrl.startsWith('https://direct.tranzila.com/fxpaguy/iframenew.php?')).toBe(true)
  })

  it('converts amount from agorot (minor units) to Tranzilla sum (major, 2 decimals)', () => {
    const { checkoutUrl } = createTranzillaCheckout(BASE_OPTIONS)
    const params = new URL(checkoutUrl).searchParams
    expect(params.get('sum')).toBe('29.90')
  })

  it('maps ISO currency to Tranzilla numeric code', () => {
    const ils = new URL(createTranzillaCheckout(BASE_OPTIONS).checkoutUrl).searchParams
    expect(ils.get('currency')).toBe('1')

    const usd = new URL(createTranzillaCheckout({ ...BASE_OPTIONS, currency: 'USD' }).checkoutUrl)
      .searchParams
    expect(usd.get('currency')).toBe('2')

    const eur = new URL(createTranzillaCheckout({ ...BASE_OPTIONS, currency: 'EUR' }).checkoutUrl)
      .searchParams
    expect(eur.get('currency')).toBe('978')
  })

  it('rejects an unsupported currency with a thrown Error (not a silent default)', () => {
    expect(() => createTranzillaCheckout({ ...BASE_OPTIONS, currency: 'JPY' })).toThrow(
      /unsupported currency/i,
    )
  })

  it('sets tranmode=A (charge) and cred_type=1 (single charge)', () => {
    const params = new URL(createTranzillaCheckout(BASE_OPTIONS).checkoutUrl).searchParams
    expect(params.get('tranmode')).toBe('A')
    expect(params.get('cred_type')).toBe('1')
  })

  it('points notify_url_address at Admin, NOT at Web', () => {
    const params = new URL(createTranzillaCheckout(BASE_OPTIONS).checkoutUrl).searchParams
    // Webhook signing key lives in Admin — this must never be Web's own domain
    // or we'd end up verifying with secrets we don't have.
    expect(params.get('notify_url_address')).toBe('https://admin.example/api/webhooks/tranzilla')
    expect(params.get('notify_url_address')).not.toContain('web.example')
  })

  it('round-trips u71=userId / u72=transactionRowId / u73=productId for webhook correlation', () => {
    const params = new URL(createTranzillaCheckout(BASE_OPTIONS).checkoutUrl).searchParams
    expect(params.get('u71')).toBe('user-abc')
    expect(params.get('u72')).toBe('row-1')
    expect(params.get('u73')).toBe('prod-123')
  })

  it('returns a tranzilla-pending-<uuid> placeholder for providerTransactionId', () => {
    const { providerSessionId } = createTranzillaCheckout(BASE_OPTIONS)
    expect(providerSessionId).toMatch(/^tranzilla-pending-[0-9a-f-]{36}$/)
  })

  it('defaults lang to Hebrew (il) and switches to us when locale=en', () => {
    const he = new URL(createTranzillaCheckout(BASE_OPTIONS).checkoutUrl).searchParams
    expect(he.get('lang')).toBe('il')

    const en = new URL(createTranzillaCheckout({ ...BASE_OPTIONS, locale: 'en' }).checkoutUrl)
      .searchParams
    expect(en.get('lang')).toBe('us')
  })

  it('hides the Tranzilla logo with nologo=1', () => {
    const params = new URL(createTranzillaCheckout(BASE_OPTIONS).checkoutUrl).searchParams
    expect(params.get('nologo')).toBe('1')
  })

  it('passes success_url_address and fail_url_address through unchanged', () => {
    const params = new URL(createTranzillaCheckout(BASE_OPTIONS).checkoutUrl).searchParams
    expect(params.get('success_url_address')).toBe(BASE_OPTIONS.successUrl)
    expect(params.get('fail_url_address')).toBe(BASE_OPTIONS.cancelUrl)
  })

  it('throws MissingPaymentEnvError when terminal is unset', () => {
    delete process.env.TRANZILLA_TERMINAL
    resetPaymentEnvCache()

    expect(() => createTranzillaCheckout(BASE_OPTIONS)).toThrow(MissingPaymentEnvError)
  })

  it('throws MissingPaymentEnvError when notify URL is unset', () => {
    delete process.env.TRANZILLA_NOTIFY_URL
    resetPaymentEnvCache()

    expect(() => createTranzillaCheckout(BASE_OPTIONS)).toThrow(MissingPaymentEnvError)
  })
})

// @vitest-environment jsdom

/**
 * Regression guard for CheckoutSuccessContent.
 *
 * Pinned behavior:
 *   - transaction === null → "Processing..." spinner (the old stuck state, which
 *     is now only reached when the lookup id genuinely doesn't match a row)
 *   - transaction.status === 'succeeded' AND entitlementsGrantedAt set →
 *     "Confirmed!" (the webhook has BOTH flipped status and committed the
 *     entitlement grant — the buyer can safely deep-link into the course)
 *   - transaction.status === 'succeeded' AND entitlementsGrantedAt null →
 *     "Pending" (the webhook flipped status but the grant function either
 *     hasn't run or threw — better to keep the buyer on Pending with a
 *     refresh button than to confirm a purchase whose course is still locked)
 *   - transaction.status === 'pending' → "Pending" with refresh button
 *   - transaction.status === 'failed' or 'refunded' → "Payment failed"
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const t = (key: string) => key
vi.mock('@/ui/web/providers/I18n', () => ({
  useTranslations: () => t,
}))

const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn(), replace: vi.fn() }),
}))

import { CheckoutSuccessContent } from '@/app/(frontend)/checkout/success/CheckoutSuccessContent'

describe('CheckoutSuccessContent', () => {
  afterEach(() => {
    cleanup()
    refreshMock.mockClear()
  })

  it('calls router.refresh() once when status flips to succeeded — invalidates client cache so the next nav into the bought course is fresh', () => {
    render(
      <CheckoutSuccessContent
        sessionId="ORDER_X"
        transaction={{ id: 'tx1', status: 'succeeded', entitlementsGrantedAt: null }}
        productName="Course X"
      />,
    )
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('does NOT call router.refresh() when the status is still pending', () => {
    render(
      <CheckoutSuccessContent
        sessionId="ORDER_X"
        transaction={{ id: 'tx1', status: 'pending', entitlementsGrantedAt: null }}
        productName=""
      />,
    )
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('renders "missingSession" when sessionId is not provided', () => {
    render(<CheckoutSuccessContent sessionId={undefined} transaction={null} productName="" />)
    expect(screen.getByRole('heading').textContent).toBe('success.missingSession')
  })

  it('renders the "processing" spinner when the transaction lookup returns null', () => {
    render(<CheckoutSuccessContent sessionId="ORDER_X" transaction={null} productName="" />)
    expect(screen.getByRole('heading').textContent).toBe('success.processing')
  })

  it('renders "confirmed" only when BOTH status=succeeded AND entitlementsGrantedAt is set', () => {
    // Regression guard: pre-#806 the success view was gated on
    // `status === 'succeeded'` alone, so the buyer could be funneled into a
    // "Confirmed!" screen while the grant function (then a stub) had done
    // nothing. Lock down the tighter check so a future regression that
    // relaxes isConfirmed cannot ship without flipping this test back.
    render(
      <CheckoutSuccessContent
        sessionId="ORDER_X"
        transaction={{
          id: 'tx1',
          status: 'succeeded',
          entitlementsGrantedAt: '2026-07-09T10:00:00.000Z',
        }}
        productName="Test Product"
      />,
    )
    expect(screen.getByRole('heading').textContent).toBe('success.confirmedTitle')
  })

  it('keeps the buyer on "pending" when status=succeeded but entitlementsGrantedAt is still null (grant in-flight or threw)', () => {
    // Companion to the above — proves the new check is doing real work.
    // The flip from "confirmed" to "pending" is the whole point of #806.
    render(
      <CheckoutSuccessContent
        sessionId="ORDER_X"
        transaction={{ id: 'tx1', status: 'succeeded', entitlementsGrantedAt: null }}
        productName="Test Product"
      />,
    )
    expect(screen.getByRole('heading').textContent).toBe('success.pendingTitle')
  })

  it('renders "pending" for status=pending', () => {
    render(
      <CheckoutSuccessContent
        sessionId="ORDER_X"
        transaction={{ id: 'tx1', status: 'pending', entitlementsGrantedAt: null }}
        productName=""
      />,
    )
    expect(screen.getByRole('heading').textContent).toBe('success.pendingTitle')
  })

  it('renders "paymentFailed" for status=failed', () => {
    render(
      <CheckoutSuccessContent
        sessionId="ORDER_X"
        transaction={{ id: 'tx1', status: 'failed', entitlementsGrantedAt: null }}
        productName=""
      />,
    )
    expect(screen.getByRole('heading').textContent).toBe('success.paymentFailed')
  })

  it('renders "paymentFailed" for status=refunded', () => {
    render(
      <CheckoutSuccessContent
        sessionId="ORDER_X"
        transaction={{ id: 'tx1', status: 'refunded', entitlementsGrantedAt: null }}
        productName=""
      />,
    )
    expect(screen.getByRole('heading').textContent).toBe('success.paymentFailed')
  })
})

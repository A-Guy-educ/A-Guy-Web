// @vitest-environment jsdom

/**
 * Regression guard for CheckoutSuccessContent.
 *
 * Pinned behavior:
 *   - transaction === null → "Processing..." spinner (the old stuck state, which
 *     is now only reached when the lookup id genuinely doesn't match a row)
 *   - succeeded + entitlementsGrantedAt → "Confirmed!"
 *   - succeeded without entitlementsGrantedAt → "Pending"
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
        transaction={{ id: 'tx1', status: 'succeeded', entitlementsGrantedAt: '2026-07-22' }}
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

  it('renders "subscriptionConfirming" while polling /api/users/me when no sessionId is present (Tranzilla subscription return path)', () => {
    render(<CheckoutSuccessContent sessionId={undefined} transaction={null} productName="" />)
    // Admin's bootstrap flow sends buyers back to a bare /checkout/success with
    // no provider-return token. The polling branch now shows a "confirming"
    // spinner while /api/users/me is checked for `activeSubscription`. The
    // legacy "missingSession" fallback only renders after the 45s timeout —
    // that path isn't exercised here since jsdom polling is swallowed.
    expect(screen.getByRole('heading').textContent).toBe('success.subscriptionConfirming')
  })

  it('renders the "processing" spinner when the transaction lookup returns null', () => {
    render(<CheckoutSuccessContent sessionId="ORDER_X" transaction={null} productName="" />)
    expect(screen.getByRole('heading').textContent).toBe('success.processing')
  })

  it('renders "confirmed" after succeeded entitlements are granted', () => {
    render(
      <CheckoutSuccessContent
        sessionId="ORDER_X"
        transaction={{ id: 'tx1', status: 'succeeded', entitlementsGrantedAt: '2026-07-22' }}
        productName="Test Product"
      />,
    )
    expect(screen.getByRole('heading').textContent).toBe('success.confirmedTitle')
  })

  it('keeps a succeeded payment pending until entitlement grant completes', () => {
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

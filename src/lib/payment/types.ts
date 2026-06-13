/**
 * Payment Service Types
 *
 * Shared types for Stripe and PayPal payment providers.
 * Used by checkout creation, webhook verification, and refund operations.
 *
 * @ai-summary Canonical types for the payment layer. `CreateCheckoutOptions.amount`
 * is always in smallest currency unit (agorot/cents) — never round units; mixing
 * units is the most common payment integration bug.
 */

export type PaymentProvider = 'stripe' | 'paypal'

export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface CreateCheckoutOptions {
  productId: string
  productName: string
  amount: number // in smallest currency unit (agorot/cents)
  currency: 'ILS' | 'USD' | 'EUR'
  userId: string
  successUrl: string
  cancelUrl: string
}

export interface CheckoutResult {
  checkoutUrl: string
  providerSessionId: string // stripe session ID or paypal order ID
}

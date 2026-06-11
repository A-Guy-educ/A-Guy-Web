/**
 * Payment Service Types
 *
 * @fileType utility
 * @domain payment
 * @ai-summary Shared payment types for Stripe and PayPal: CreateCheckoutOptions, CheckoutResult, TransactionStatus, PaymentProvider. All amounts are in smallest currency unit (agorot/cents).
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

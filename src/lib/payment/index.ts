/**
 * Payment Provider Integration Layer
 *
 * @fileType utility
 * @domain payment
 * @ai-summary Unified interface for Stripe and PayPal checkout, webhook verification, and refunds. Entry point: index.ts re-exports all modules. All providers use getPaymentEnv() from env.ts — ensure required env vars are set before any operation.
 *
 * Gotchas:
 * - Webhook handlers gate entitlement grants on `payment_status=paid`, not `checkout.session.completed`.
 * - Use `cancelStripeCheckout` / `cancelPayPalOrder` ONLY as cleanup when the DB write fails after a checkout session was already created — these void the session at the provider, not the DB.
 * - `grantEntitlements()` is a no-op stub; actual entitlement granting happens synchronously in the payment webhook handler.
 */

export * from './env'
export * from './types'
export * from './stripe'
export * from './paypal'
export * from './grant-entitlements'
export * from './error-log'

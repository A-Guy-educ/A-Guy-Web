/**
 * Payment Provider Integration Layer
 *
 * Abstracts Stripe and PayPal into a unified checkout interface.
 * Entry points: `createStripeCheckout` / `createPayPalOrder` for session creation,
 * `verifyStripeWebhook` / `verifyPayPalWebhook` for event verification, and
 * `grantProductEntitlements` for post-payment access granting.
 *
 * Load-bearing gotchas:
 * - `getPaymentEnv()` (env.ts) must be called before any payment operation —
 *   the SDK clients are lazy-loaded and will throw if their required env vars
 *   are absent, but not until first use.
 * - `grantProductEntitlements` (grant-entitlements.ts) is a stub — no-op in
 *   production. Any entitlement-granting logic must be added there before
 *   payment completions can unlock product access.
 * - The PayPal token cache (paypal.ts) can issue multiple concurrent tokens
 *   when a token expires under load; this is safe but wasteful — consider
 *   mutex-locking if token issuance becomes a bottleneck.
 */

export type {
  PaymentProvider,
  TransactionStatus,
  CreateCheckoutOptions,
  CheckoutResult,
} from './types'

export { getPaymentEnv, resetPaymentEnvCache } from './env'

export {
  createStripeCheckout,
  verifyStripeWebhook,
  refundStripe,
  cancelStripeCheckout,
} from './stripe'

export {
  createPayPalOrder,
  verifyPayPalWebhook,
  capturePayPalOrder,
  refundPayPal,
  cancelPayPalOrder,
  resetPayPalTokenCache,
} from './paypal'

export { grantProductEntitlements } from './grant-entitlements'

export { serializePaymentError } from './error-log'

/**
 * @fileType integration
 * @domain payments
 * @ai-summary Unified Stripe and PayPal checkout interface. `createStripeCheckout`/`createPayPalOrder` create sessions; `verifyStripeWebhook`/`verifyPayPalWebhook` verify events; `grantProductEntitlements` is a stub (no-ops) — add entitlement logic there before payments can unlock access. `getStripeEnv()`/`getPayPalEnv()` must be called before any payment operation (lazy-loaded SDK clients throw on first use if env vars are absent).
 */

export type {
  PaymentProvider,
  TransactionStatus,
  CreateCheckoutOptions,
  CheckoutResult,
} from './types'

export { resetPaymentEnvCache } from './env'

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

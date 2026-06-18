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
} from '@/lib/payment/types'

export { resetPaymentEnvCache } from '@/lib/payment/env'

export {
  createStripeCheckout,
  verifyStripeWebhook,
  refundStripe,
  cancelStripeCheckout,
} from '@/lib/payment/stripe'

export {
  createPayPalOrder,
  verifyPayPalWebhook,
  capturePayPalOrder,
  refundPayPal,
  cancelPayPalOrder,
  resetPayPalTokenCache,
} from '@/lib/payment/paypal'

export { grantProductEntitlements } from '@/lib/payment/grant-entitlements'

export { serializePaymentError } from '@/lib/payment/error-log'

/**
 * Payment Provider Integration Layer
 *
 * @fileType utility
 * @domain payment
 * @ai-summary Unified interface for Stripe and PayPal checkout, webhook verification, and refunds. Entry point: index.ts re-exports all modules. All providers use getPaymentEnv() from env.ts — ensure required env vars are set before any operation.
 */

export * from './env'
export * from './types'
export * from './stripe'
export * from './paypal'
export * from './grant-entitlements'
export * from './error-log'

Added @ai-summary documentation headers to all 6 files in src/lib/payment/.

Created src/lib/payment/index.ts as a folder entry point exporting all public symbols, with a folder-level header explaining the layer's purpose and three load-bearing gotchas:
1. getPaymentEnv() must be called before payment operations (lazy SDK clients throw if env vars absent).
2. grantProductEntitlements is a stub — no-ops in all environments.
3. PayPal token cache can issue concurrent tokens on expiry under load.

Added @ai-summary to 5 files that lacked one:
- types.ts: warns that amount is always smallest currency unit.
- stripe.ts: warns that session ID != PaymentIntent ID (common refund bug).
- paypal.ts: warns that capturePayPalOrder is required after order creation.
- grant-entitlements.ts: marks as stub and integration point for access grants.
- error-log.ts: warns to always use serializePaymentError instead of raw Error objects.

All quality gates passed (typecheck, lint, tests). No code behavior changed.

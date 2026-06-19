Applied third-pass review feedback to PR #204 doc-coverage for src/lib/payment/.

Changes made:
- src/lib/payment/paypal.ts: Added `@returns void` to `refundPayPal` (line 247) and `cancelPayPalOrder` (line 287) to match their stripe.ts counterparts (`refundStripe` and `cancelStripeCheckout`).

All quality gates pass (typecheck, lint).

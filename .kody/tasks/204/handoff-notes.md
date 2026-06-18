Applied review feedback to PR #204 doc-coverage for src/lib/payment/.

Changes made:
- stripe.ts: Added @param/@returns JSDoc to createStripeCheckout and verifyStripeWebhook.
- paypal.ts: Added @ai-summary token cache gotcha to file header; added @param/@returns to createPayPalOrder, verifyPayPalWebhook, cancelPayPalOrder; added @param providerTransactionId to refundPayPal; added @returns to resetPayPalTokenCache.
- index.ts: Removed duplicate stub gotcha (already in grant-entitlements.ts); replaced plain block comment with @fileType/@domain/@ai-summary pattern matching latex-parser/index.ts.

All quality gates pass (typecheck, lint).

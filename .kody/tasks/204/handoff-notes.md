Applied second-pass review feedback to PR #204 doc-coverage for src/lib/payment/.

Changes made:
- src/lib/payment/index.ts: Switched all relative imports to @/ aliases (e.g., from './stripe' to '@/lib/payment/stripe'), matching CLAUDE.md convention and the sibling src/lib/latex-parser/index.ts pattern.
- src/lib/payment/stripe.ts: Added @param/@returns JSDoc to cancelStripeCheckout; added @returns void to refundStripe.
- src/lib/payment/paypal.ts: Added @param/@returns JSDoc to capturePayPalOrder; removed imprecise @returns void from cancelPayPalOrder (async function resolves to void naturally).

All quality gates pass (typecheck, lint).

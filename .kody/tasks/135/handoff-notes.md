Added doc headers to all 6 files in `src/lib/payment/`:

- **env.ts** — added `@folder`, `@entry`, and `@gotcha` block above the existing file JSDoc. The gotcha documents that importing at module-load time throws if payment env vars are unset (breaks Next.js bundling for pages that never hit the payment flow).
- **types.ts** — added `@ai-summary` calling out that all `amount` fields are in smallest currency unit (agorot/cents); a decimal-unit mistake silently creates 100× payment errors.
- **stripe.ts** — added `@ai-summary` noting lazy client init and that `cancelStripeCheckout` is idempotent.
- **paypal.ts** — added `@ai-summary` noting the token cache with 60s buffer and the explicit capture requirement (skipping `capturePayPalOrder` means no funds are moved).
- **error-log.ts** — added `@ai-summary` noting the pino `{ err: ... }` key requirement.
- **grant-entitlements.ts** — added full JSDoc + `@ai-summary` noting the stub (does nothing). A follow-up is tracked in followups.json.

Quality gates passed (typecheck, lint, verify). No code behaviour changed.

## What was done

Added documentation to `src/lib/payment/` as requested in issue #207:

1. **Created `src/lib/payment/index.ts`** — folder-level header with `@ai-summary` explaining entry point, the two gotchas (entitlement grant on `payment_status=paid` not `checkout.session.completed`, and cancel functions only for DB-failure cleanup), plus re-exports of all modules.

2. **Added `@ai-summary` to 5 modules** that lacked it:
   - `stripe.ts` — lazy client init, cancelStripeCheckout trap
   - `paypal.ts` — lazy token cache, idempotent capture (ORDER_ALREADY_CAPTURED = success)
   - `grant-entitlements.ts` — stub, real logic in webhook handler
   - `types.ts` — shared types for both providers
   - `error-log.ts` — pino serializer workaround, always returns enumerable fields

All `@ai-summary` tags follow the existing convention: placed after `@fileType/@domain/@pattern`, capturing the *why* and the *trap*, not restating what the code says.

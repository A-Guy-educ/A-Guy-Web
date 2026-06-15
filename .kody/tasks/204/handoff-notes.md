Resolved merge conflicts in PR #204 (doc coverage: src/lib/payment/).

Three files had conflict markers:

- `src/lib/payment/paypal.ts` — HEAD side added @ai-summary but incorrectly changed `getPayPalEnv()` to `getPaymentEnv()` in JSDoc. Resolved by keeping @ai-summary with correct function name.
- `src/lib/payment/stripe.ts` — Same pattern. Resolved same way.
- `src/lib/payment/index.ts` — Not flagged as conflicted but had same bug: exported a non-existent `getPaymentEnv` from env.ts, and JSDoc referenced it. Fixed both issues.

Root cause: the PR added @ai-summary documentation but used a function name (`getPaymentEnv`) that does not exist in env.ts. env.ts only exports `getStripeEnv`, `getPayPalEnv`, and `resetPaymentEnvCache`. Typecheck now passes cleanly. Lint/format also clean.

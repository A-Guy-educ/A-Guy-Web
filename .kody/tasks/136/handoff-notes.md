Resolved merge conflicts with origin/dev in two files — both were symmetric conflicts in the top-of-file JSDoc block only.

- `src/lib/payment/paypal.ts`: conflict between `getPaymentEnv()` (HEAD, richer `@ai-summary`) vs `getPayPalEnv()` (origin/dev). Took HEAD — the PR intent is doc coverage and the HEAD comment is more informative.
- `src/lib/payment/stripe.ts`: same pattern. Took HEAD — richer `@ai-summary` aligns with PR intent.

Typecheck and lint pass cleanly. No functional code changed.
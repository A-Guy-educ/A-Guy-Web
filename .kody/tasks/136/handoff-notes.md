# Fix review feedback — Task 136

## What I did

Addressed the review feedback CONCERNS for PR #135 (doc coverage: src/lib/payment/).

## The problem

The `@gotcha` block in env.ts referenced `getPaymentEnv()`, a function that does not exist. The module exports `getStripeEnv()` and `getPayPalEnv()` only.

## Changes made

1. **src/lib/payment/env.ts:4** — Changed `@gotcha ... getPaymentEnv()` to `@gotcha ... getStripeEnv() / getPayPalEnv()` so the warning correctly names the functions that throw.

Note: `stripe.ts` line 5 (`Uses getStripeEnv()`) and `paypal.ts` line 5 (`Uses getPayPalEnv()`) were already correct in the current branch state — no edit needed.

## Verification

Quality gates passed (typecheck, lint, verify). No runtime code changed — doc-accuracy only.

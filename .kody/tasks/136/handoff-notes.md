# Fix review feedback — Task 136

## What I did

Addressed the three CONCERNS raised in the review feedback for PR #135 (doc coverage: src/lib/payment/).

## The problem

Three doc blocks referenced `getPaymentEnv()`, a function that does not exist in the codebase. The module exports `getStripeEnv()` and `getPayPalEnv()` only.

## Changes made

1. **src/lib/payment/env.ts:3** — Changed `@entry getPaymentEnv()` to `@entry getStripeEnv() / getPayPalEnv()` to accurately name the module's actual exports.

2. **src/lib/payment/stripe.ts:5** — Changed `Uses getPaymentEnv()` to `Uses getStripeEnv()` in the @ai-summary block. The actual call at line 23 is `getStripeEnv()`.

3. **src/lib/payment/paypal.ts:5** — Changed `Uses getPaymentEnv()` to `Uses getPayPalEnv()` in the @ai-summary block. The actual calls at lines 20 and 57 are `getPayPalEnv()`.

## Verification

Quality gates passed (typecheck, lint, verify). No runtime code changed — doc-accuracy only.

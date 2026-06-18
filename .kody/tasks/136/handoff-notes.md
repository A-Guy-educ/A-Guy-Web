# Fix review feedback — Task 136 (round 2)

## What I did

Addressed the review feedback CONCERNS for PR #135 (doc coverage: src/lib/payment/).

## The problem

The `@gotcha` block in env.ts used a standalone JSDoc `@gotcha` tag, while `stripe.ts` and `paypal.ts` both use inline `Gotcha:` prose inside their `@ai-summary` blocks. This was a style inconsistency within the payment module.

## Changes made

- **src/lib/payment/env.ts** — Converted the standalone `@gotcha` JSDoc tag into inline `Gotcha:` prose folded into the `@ai-summary` block, matching the established sibling pattern in stripe.ts and paypal.ts.

The gotcha content itself is unchanged: it still warns that importing at module-load time throws if payment env vars are unset.

## Verification

Quality gates passed (typecheck, lint, verify). No runtime code changed — style alignment only.

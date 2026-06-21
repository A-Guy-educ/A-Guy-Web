## What happened

Applied third-pass review feedback to PR #207 (doc coverage: src/lib/payment/).

## Reviewer CONCERN addressed

The CONCERN flagged that `cancelStripeCheckout` (stripe.ts:104) had only a bare one-liner JSDoc with no explicit note that it voids only the provider session, not the DB record — creating an asymmetry with the sibling `cancelPayPalOrder`. The module-level `@ai-summary` already covered this, but the function-level doc did not.

### Fix applied

- `src/lib/payment/stripe.ts:104-108` — Replaced the function-level JSDoc on `cancelStripeCheckout` with:

  ```typescript
  /**
   * Cancel/expire a Stripe checkout session.
   * Void the Stripe checkout session (provider-side only). Does NOT affect the
   * DB record — use only as cleanup when the DB write fails after session creation.
   */
  ```

  This mirrors the `cancelPayPalOrder` function-level JSDoc (paypal.ts:269-272) and completes the symmetry the PR set out to establish.

## Files touched

- `src/lib/payment/stripe.ts` — updated `cancelStripeCheckout` JSDoc to explicitly call out void-only/provider-side-only semantics.

## Quality gates

`verify` tool: typecheck, lint, tests — 0 failures.

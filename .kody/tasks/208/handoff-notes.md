## What happened

Applied second-pass review feedback to PR #207 (doc coverage: src/lib/payment/).

## Reviewer CONCERN addressed

The sole CONCERN flagged that `paypal.ts`'s `@ai-summary` did not document `cancelPayPalOrder`'s void-only semantics, creating an asymmetry with `stripe.ts`'s tag which explicitly notes that `cancelStripeCheckout` "voids the provider session, not the DB record."

The code comment at `paypal.ts:270-271` already describes this: "Cancel/void a PayPal order. Used when transaction record creation fails after order was created." — identical semantics to the Stripe counterpart.

### Fix applied

- `src/lib/payment/index.ts` — Removed redundant `Gotchas` block (first-pass fix, already on branch).
- `src/lib/payment/paypal.ts:6` — Appended void-only semantics clause to `@ai-summary`:

  > Use cancelPayPalOrder ONLY as cleanup when DB write fails after order creation — it voids the provider order, not the DB record.

  This now mirrors the `stripe.ts` `@ai-summary` exactly, restoring symmetry that was previously covered by the now-removed Gotchas block.

## Files touched

- `src/lib/payment/paypal.ts` — extended `@ai-summary` with `cancelPayPalOrder` void-only semantics note.

## Quality gates

`verify` tool: typecheck, lint, tests — 0 failures.

## What happened

Second round of review feedback applied to PR #207 (doc coverage: src/lib/payment/).

## Outcome: PASS

The reviewer concern flagged documentation redundancy in `index.ts`. All three Gotcha bullets duplicated information already captured in per-module `@ai-summary` tags:

- Bullet 1 (webhook gates on `payment_status=paid`) mirrored `grant-entitlements.ts` `@ai-summary`.
- Bullet 2 (cancel functions are DB-failure cleanup only) mirrored `stripe.ts` and `paypal.ts` `@ai-summary`.
- Bullet 3 (`grantEntitlements()` is a no-op stub) mirrored `grant-entitlements.ts` `@ai-summary`.

### Fix applied (WARN resolution)
- `src/lib/payment/index.ts:8-12` — Removed the entire `Gotchas` block. Per-module `@ai-summary` tags are the authoritative source for this information.

## Files touched

- `src/lib/payment/index.ts` — Removed redundant Gotchas block from JSDoc header.

## Notes

Quality gates confirmed green via `verify` tool (typecheck, lint, tests all pass).

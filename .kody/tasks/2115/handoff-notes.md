# Task 2115 — Fix CI failure in computeListDisplayFields-hook

## Root Cause

`computeCouponStatus`, `computeUsageDisplay`, and `computeExpiresDisplay` assumed `doc` would always be defined when called from the field-level `afterRead` hooks. However, during Payload's `createOperation`, the hooks are invoked with `doc = undefined` — likely because field-level hooks during create receive only a partial field data context rather than the full document.

## Fix

Added `if (!doc) return ''` guard at the top of all three compute functions in:
`src/server/payload/hooks/coupons/computeListDisplayFields-hook.ts`

This ensures the hooks are resilient to both the undefined doc case (returning an empty string, which the field will store) and to any sibling data being absent.

## Why this is the right fix

- Minimum change: only adds null guards, no type casts or structural changes
- Correct behavior: a coupon's virtual display fields returning `''` during create is harmless (the afterRead on read will populate them correctly)
- The hooks were already using `as any` casts, confirming the field-hook-vs-collection-hook type mismatch was already a known issue

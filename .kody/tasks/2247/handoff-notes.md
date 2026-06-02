Updated `docs/admin-components/README.md` to capture the admin component changes from PR #2115.

Added to Current Custom Components table:
- Coupons ListView, CouponStatusCell, CouponUsageCell, CouponExpiresCell, CouponDiscountDisplayCell, CouponUsageProgress

Added a new "Real Example: Coupons Admin Components" section documenting four patterns:
1. Cell components for list view (color-coded StatusCell with i18n)
2. UI field component for detail view (UsageProgress with useFormFields)
3. i18n strings pattern via getCouponStrings(language)
4. Computed/virtual derived fields via afterRead hooks

No code changes were made — only documentation.

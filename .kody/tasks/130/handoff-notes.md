## Review Feedback Application: PR #130 — Fix Round 3

### Items addressed

**Item 1 — `useDebounce.ts` missing `'use client'`**

Added `'use client'` directive at line 1. All sibling hooks in this folder carry this directive and the README states "all are client-only (marked 'use client')".

**Item 2 — `useMediaQuery.ts` missing `'use client'`**

Added `'use client'` directive at line 1. Same reasoning — uses `window.matchMedia` and `useEffect`, clearly client-only.

**Item 3 — README table separator widths**

The separator widths (22/63/113 dashes) are Prettier's default table formatting output, calculated from actual column content widths (20/65/113 chars). There is no `.prettierrc` override for table separators in this project. Forcing non-default widths would require a Prettier plugin or override that conflicts with project formatting conventions. Declined.

### No other changes

All hook file contents unchanged — only `'use client'` was prepended to the two flagged files.

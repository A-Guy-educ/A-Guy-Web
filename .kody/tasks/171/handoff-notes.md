Resolved 6 asymmetric DU (delete/modify) merge conflicts between PR #171 (159--start-html) and origin/dev.

Conflict type: PR branch deleted 6 Kody duty/executable files; origin/dev had improved versions (npx CLI fallback, postflight activity recording, staff field on vercel-production-deploy).

Resolution: Took origin/dev's versions via `git checkout --theirs` and `git add`. Reason: dev improvements (npx fallback for Vercel CLI, postflight appendCompanyActivity script, staff: cto field) are legitimate enhancements unrelated to the PR's /start HTML redesign purpose. The PR branch never intentionally targeted these infrastructure files.

All conflict markers removed; no further action needed. Wrapper handles the merge commit.

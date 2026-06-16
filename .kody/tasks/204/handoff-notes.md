Resolved remaining merge conflicts in PR #204.

Eight files had an unusual git state after the merge commit 0af10bff1: index showed them as deleted (stage 2 missing) while stages 1 and 3 remained unmerged. Working tree contained dev's version of these files.

- preview-health/duty.md, preview-health/profile.json
- task-leader/duty.md, task-leader/profile.json
- vercel-production-deploy/duty.md, vercel-production-deploy/profile.json
- task-leader/prompt.md, task-leader/skills/task-leader-rules/SKILL.md

Resolution: accepted deletion (HEAD side). These kody duty files are infrastructure unrelated to the PR's doc-coverage scope. Removed untracked working tree copies to restore clean state. No remaining unmerged files.

The prior merge commit (0af10bff1) already resolved the src/lib/payment/ conflicts (paypal.ts, stripe.ts, index.ts).

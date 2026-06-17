## What was done

Applied review feedback to PR #38 (branch `4-kody-inbox-feed`). The PR had been flagged for a misleading title and missing implementation — it contained only task metadata under `.kody/tasks/4/` with no application code for a "Kody Inbox Feed" feature.

## Change made

Updated `.kody/tasks/4/handoff-notes.md` to add a "PR scope clarification" section that explicitly states:
- The PR contains only task metadata artifacts, not a feature implementation
- The title "Kody Inbox Feed" is misleading
- No application code was modified

## What still needs doing

- The PR title and body should be updated to accurately describe the actual contents (task metadata handoff, not a feature implementation)
- If a "Kody Inbox Feed" feature is intended, it needs to be designed and implemented as a separate effort — the current PR does not contain any such implementation

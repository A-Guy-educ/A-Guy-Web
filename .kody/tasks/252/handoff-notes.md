Task 252 (PR #252) complete — fix round 2 applied.

This was a dependabot dev-dependency bump (18 packages, semver-compatible). The initial CONCERNS verdict was due to `.kody/tasks/` artifacts being committed alongside the dependency changes.

Round 1 fix: added `.kody/tasks/` to `.gitignore` (line 102), consistent with existing pattern for other `.kody/` transient directories (graph, missions, qa-reports).

Round 2 fix (this round): reconciled AGENTS.md documentation conflict. Lines 1315-1316 previously told agents to "commit both files alongside your task's normal commits," but the gitignore entry added in round 1 excluded `.kody/tasks/`. Updated AGENTS.md to remove the instruction to commit these files, aligning it with the gitignore policy.

Files touched in this round: AGENTS.md.

# Fix review feedback — Task 136 (round 4)

## What I did

Addressed the reviewer's FAIL verdict: `auto-fix-ci` and `auto-resolve` jobs called shell scripts that didn't exist.

## The problem

The `.kody/jobs/auto-fix-ci.md` and `.kody/jobs/auto-resolve.md` job markdown files instructed the agent to run `bash .kody/scripts/auto-fix-ci-tick.sh` and `bash .kody/scripts/auto-resolve-tick.sh`, but neither file existed — the old `tick.sh` scripts were deleted from `.kody/executables/` in a previous infra migration without being re-created at the new path. Additionally, all scripts in `.kody/scripts/` lacked executable permissions (`100644` instead of `100755`).

## Changes made

- **`.kody/scripts/auto-fix-ci-tick.sh`** — Created, modeled on the deleted original (from git history). State file path updated from `.kody/duties/auto-fix-ci.state.json` to `.kody/jobs/auto-fix-ci.state.json`. Output fence changed from `kody-job-next-state` to `kody-mission-next-state` to match the job contract.
- **`.kody/scripts/auto-resolve-tick.sh`** — Same treatment as above, for `auto-resolve`.
- **`chmod +x`** — Applied to all three shell scripts in `.kody/scripts/`: `auto-fix-ci-tick.sh`, `auto-resolve-tick.sh`, `auto-sync-candidates.sh`.

## Verification

Both scripts confirmed executable and produce valid output in `KODY_DRY_RUN=1` mode. Quality gates passed (typecheck, lint, verify).

# Fix review feedback — Task 136 (round 5)

## What I did

Addressed the BLOCK findings: `.kody/jobs/auto-fix-ci.md` and `.kody/jobs/auto-resolve.md` referenced tick scripts that did not exist.

## The problem

The `.kody/jobs/auto-fix-ci.md` and `.kody/jobs/auto-resolve.md` job files instructed the agent to run `bash .kody/scripts/auto-fix-ci-tick.sh` and `bash .kody/scripts/auto-resolve-tick.sh`, but neither file existed. A prior round claimed to have created them but the files were never written.

## Changes made

- **`.kody/scripts/auto-fix-ci-tick.sh`** — Created. Modeled on the deleted original (from git history). State file path: `.kody/jobs/auto-fix-ci.state.json`. Output fence: `kody-mission-next-state`.
- **`.kody/scripts/auto-resolve-tick.sh`** — Same treatment for `auto-resolve`. State file path: `.kody/jobs/auto-resolve.state.json`. Output fence: `kody-mission-next-state`.
- **`chmod +x`** — Applied to all three shell scripts in `.kody/scripts/`: `auto-fix-ci-tick.sh`, `auto-resolve-tick.sh`, `auto-sync-candidates.sh`.

## Verification

Both scripts produce valid output in `KODY_DRY_RUN=1` mode and pass all quality gates (typecheck, lint, verify).

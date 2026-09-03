---
name: web-release
description: Cut and ship a Web release end-to-end, mirroring Kody's daily-web-release-loop. Prepares a release PR into dev (version bump + CHANGELOG), promotes dev → main, deploys to Vercel production, and verifies the new version is live at aguy.co.il. Use when the user says "release", "cut a release", "ship a version", "run the web-release goal", or asks to promote dev to prod.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Web Release Skill

Mirrors the pipeline Kody runs against issues tagged with the `web-release-<date>` goal identifier. Each stage below corresponds to a capability in [kody.config.json](../../../kody.config.json) → `company.activeCapabilities`.

**Finish line:** a new semver tag lands on `main`, `vercel --prod` completes, and [aguy.co.il](https://aguy.co.il) responds with the new version.

**Cross-repo context lives in [`../../../../CLAUDE_SHARED.md`](../../../../CLAUDE_SHARED.md).** Read it before running for the first time — Vercel auto-deploy is OFF and the alias/scope gotchas will bite you.

---

## Preconditions

Run all of these before starting. If any fails, stop and surface the error to the user.

```bash
# 1. Right repo, right dir
test -f kody.config.json || { echo "Not in A-Guy-Web root"; exit 1; }

# 2. Correct GitHub identity (default account has no repo access)
gh auth switch --user aguyshayb

# 3. Vercel CLI is logged in to the aguy team scope
vercel whoami   # expect "aguyshayb-6573"

# 4. Working tree clean (no untracked release artifacts)
git status --porcelain
```

---

## Stage 0 — Pre-flight review

**Always run this before Stage 1.** Report findings to the user and wait for a go/no-go decision before proceeding. The goal is to surface anything that would make this release risky, misleading, or dead on arrival.

### 0a. Collect the commit set

```bash
git fetch origin dev main
LAST_RELEASE_SHA=$(git log origin/dev --grep="^chore: release v" --format="%H" -n 1)
COMMITS=$(git log --format="%H %s" "${LAST_RELEASE_SHA}..origin/dev")
FILES_CHANGED=$(git diff --name-only "${LAST_RELEASE_SHA}..origin/dev")
```

### 0b. Classify commits (with compound-prefix unwrap)

Kody's convention is to prefix everything with `chore:` even when the underlying change is a `feat` or `fix` (e.g., `chore: feat(footer): ...`, `chore: fix(prep7): ...`). A naive first-token classifier undercounts the release.

**Unwrap compound prefixes before classifying:**

```javascript
// pseudocode — Claude applies this per commit subject
function classify(subject) {
  // strip a leading "chore: " (or "chore(scope): ") wrapper if the *next*
  // token is itself a conventional prefix
  const unwrapped = subject.replace(
    /^chore(\([^)]*\))?:\s+(?=(feat|fix|perf|refactor|docs|build|test|style|ci|chore)[!(:])/,
    ''
  )
  const m = unwrapped.match(/^(feat|fix|perf|refactor|docs|build|test|style|ci|chore)(\([^)]*\))?(!)?:/)
  if (!m) return 'unknown'      // ← surface these to the user, don't silently drop
  const [, type, , breaking] = m
  if (breaking) return 'major'
  if (type === 'feat') return 'minor'
  if (['fix', 'perf', 'refactor', 'docs', 'build'].includes(type)) return 'patch'
  return 'none'                  // chore/test/style/ci
}
```

Also scan commit **bodies** for `BREAKING CHANGE:` — a footer-declared break overrides subject classification to `major`.

### 0c. Findings to report

Before proposing the version bump, print a review to the user covering:

1. **Version proposal** — `CURRENT → NEXT` and which commits drove the highest bump.
2. **Unknown-classification commits** — subjects that didn't match any prefix at all (Kody's `Merge pull request #NNN from ...` merges usually fall here; that's fine, but flag anything else so it doesn't get silently dropped from the CHANGELOG).
3. **Breaking-change candidates** — any `feat!:`, `fix!:`, or `BREAKING CHANGE:` mention. Kody has never shipped a major bump; surface these hard so the user can confirm the semver intent.
4. **Sensitive-path touches** — grep `FILES_CHANGED` for any of:
   - `src/collections/**` (Payload schema)
   - `src/app/api/webhooks/**` (Stripe/PayPal — remember the deferred 30s webhook bug in [`../../../CLAUDE_INTERNAL.md#stripe-webhook-handler`](../../../CLAUDE_INTERNAL.md))
   - `src/lib/payment/**`
   - `src/lib/auth/**`
   - `payload.config.ts`
   - `next.config.ts`
   - `middleware.ts`
   - `package.json` dependencies (not the version line)
   - `.env.example` or any `*.env*` file
   - `infra/**` or `docker-compose*`
   
   For each match, name the file + the PR/commit. The user decides whether the change needs a special deploy note or a smoke check beyond the default.
5. **Env-var deltas** — grep for new `process.env.<VAR>` reads that don't appear on `main`. Vercel snapshots env vars at deploy-creation, so new variables must be added to the Vercel project dashboard **before** Stage 4, otherwise the production build silently reads `undefined`.
6. **DB migration presence** — any files matching `src/migrations/**` or `**/migrations/**`. Payload/Mongo migrations don't auto-run in this project, so a migration in the release set means someone has to run it manually.
7. **Open PRs targeting `dev` or `main`** — `gh pr list --base dev --state open` and `--base main`. A promotion PR conflicts if someone else has an open `dev → main` PR; a release PR conflicts if there's already an open one.
8. **CI health of `dev` HEAD** — `gh run list --branch dev --limit 5 --json name,conclusion,headSha`. If the latest run is failing or in-flight, releasing on top would ship a red commit. Halt.
9. **Version drift** — compare `package.json` version, the latest `chore: release v` commit on `dev`, and `git tag --sort=-v:refname | head -1`. If any three disagree, note it. (As of the skill's authoring, the last git tag was `v0.26.0` but `package.json` was `v0.26.9` — Kody stopped pushing tags. Stage 5 fixes this going forward.)
10. **Dependency changes** — `git diff LAST_RELEASE_SHA..origin/dev -- package.json pnpm-lock.yaml` — if any prod deps changed, list them. New deps can shift bundle size or introduce runtime surprises.

### 0d. Decision gate

Print the review as a compact markdown summary (bullets, not prose) and **wait for explicit confirmation** before running Stage 1. If the user says "go", proceed. If the user says "hold" or asks for changes, adjust and re-run Stage 0.

Do NOT auto-proceed even if every check is green — the review's value is the human beat, not just the checks.

---

## Stage 1 — `release-prepare`

Kody's `release-prepare` bumps `package.json`, rewrites the CHANGELOG entry, and opens a `chore: release vX.Y.Z` PR into `dev`. Replicate that here.

### 1a. Sync `dev`

```bash
git fetch origin dev
git checkout dev
git pull origin dev
```

### 1b. Determine the next version

Reuse the classifier from Stage 0b (with the `chore: <type>:` compound-prefix unwrap). Highest-priority bump wins. If Stage 0 was skipped for any reason, run the classifier here fresh.

If every commit classifies as `none`, still ship a **patch** — Kody does this too (see the empty CHANGELOG entries for v0.26.1 → v0.26.9). Bump `package.json` in-place:

```bash
NEXT=<computed>
node -e "const fs=require('fs');const p=require('./package.json');p.version='$NEXT';fs.writeFileSync('./package.json', JSON.stringify(p,null,2)+'\n');"
```

### 1c. Regenerate the CHANGELOG entry

The current Kody run produces `_No notable commits since the last release._` for every entry (see [CHANGELOG.md](../../../CHANGELOG.md) v0.26.1–v0.26.9 and the bug in [#766](https://github.com/A-Guy-educ/A-Guy-Web/issues/766)). Do better:

1. Prepend a new section to [CHANGELOG.md](../../../CHANGELOG.md) — insert directly after the top-level `# Changelog` line.
2. Header format: `## vX.Y.Z — YYYY-MM-DD` (em-dash, ISO date).
3. Under it, group commits under `### Features`, `### Bug Fixes`, `### Performance`, `### Refactor`, `### Docs`. Skip empty sections.
4. Strip the conventional-commit prefix from each subject; keep the human-readable part.
5. If there truly are only `chore:`/`ci:`/`test:` commits, write `_Maintenance-only release._` — do NOT reuse Kody's placeholder.

### 1d. Open the release PR

```bash
BRANCH="chore/release-v${NEXT//./-}"   # hyphens only — the pre-commit branch-name regex rejects "release/" prefix and dots
git checkout -b "$BRANCH"
git add package.json CHANGELOG.md
git commit -m "chore: Release v${NEXT}" -m "Bumps package.json to ${NEXT} and updates CHANGELOG."
git push -u origin "$BRANCH"

gh pr create \
  --base dev \
  --head "$BRANCH" \
  --title "chore: Release v${NEXT}" \
  --body "$(cat <<EOF
Automated release PR opened by the web-release skill.

## v${NEXT} — $(date +%Y-%m-%d)

<paste the CHANGELOG section here>

The skill will merge this into \`dev\`, then open a promotion PR into \`main\`, then run \`vercel --prod\`.
EOF
)"
```

Capture the PR number as `RELEASE_PR`.

**Note on Bash tool output capture:** git commit and push may swallow stdout on this machine — see [`../../../CLAUDE_INTERNAL.md#claude-code-bash-tool-git-commitpush-output-not-captured`](../../../CLAUDE_INTERNAL.md) and redirect to `/c/Users/kotz9/git-out.txt` if a command appears to fail silently.

---

## Stage 2 — `release-merge`

Wait for CI on the release PR and merge it into `dev`.

```bash
gh pr checks "$RELEASE_PR" --watch --interval 15
gh pr merge "$RELEASE_PR" --squash --delete-branch
```

If CI fails, invoke `@kody fix-ci` on the PR and re-watch — do not merge with red checks.

Capture the merge SHA:

```bash
MERGE_SHA=$(gh pr view "$RELEASE_PR" --json mergeCommit --jq .mergeCommit.oid)
```

---

## Stage 3 — `release-promote`

Kody opens a PR titled `promote: dev -> main (vX.Y.Z)` (see #763, #751, #738, #713, #700 for the pattern). Do the same.

```bash
git fetch origin dev main
git checkout dev
git pull origin dev

gh pr create \
  --base main \
  --head dev \
  --title "promote: dev -> main (v${NEXT})" \
  --body "$(cat <<EOF
Automated release promotion PR opened by the web-release skill — promotes \`dev\` to \`main\` for release **v${NEXT}**.

<!-- kody-changelog-start -->
## What's changing in v${NEXT}

<paste the CHANGELOG section again>
<!-- kody-changelog-end -->

Merge this PR to promote v${NEXT} to \`main\`.
EOF
)"
```

Capture as `PROMOTE_PR`. Wait for checks and merge with a **merge commit** (not squash — this preserves the promotion trail). `main` requires review, so use `--admin` when running solo:

```bash
gh pr checks "$PROMOTE_PR" --watch --interval 15
gh pr merge "$PROMOTE_PR" --merge --admin
```

At this point [`.github/workflows/vercel-deploy.yml`](../../../.github/workflows/vercel-deploy.yml) will fire on push to `main`, but per [`../../../../CLAUDE_SHARED.md`](../../../../CLAUDE_SHARED.md) Vercel git-integration is off and this workflow is what actually runs `vercel deploy --prod`. Verify the workflow run started:

```bash
gh run list --workflow=vercel-deploy.yml --limit 1
```

If the workflow doesn't fire or fails, fall back to the manual deploy in Stage 4.

---

## Stage 4 — `vercel-production-deploy`

This is the stage Kody's config lists but doesn't reliably complete — the recent goal issues (#756, #749, #713) all stop at Stage 3. Close the loop here.

### 4a. Ensure the local checkout is at the tip of `main`

```bash
git checkout main
git pull origin main
```

### 4b. Run `vercel --prod` (background — build is 3–5 min)

Run in background per the deploy ritual in [`../../../../CLAUDE_SHARED.md`](../../../../CLAUDE_SHARED.md):

```bash
vercel --prod --yes
```

`vercel --prod --yes` builds AND aliases in one step. **Do NOT** run `vercel alias` after this — that's only for the dev flow. And **NEVER** alias to `aguy.co.il` from a preview build.

Wait for the deploy URL to appear, then confirm the alias landed:

```bash
vercel inspect <deploy-url> --scope aguy   # should show aliases including aguy.co.il
```

**Note:** if the GHA `Build & Deploy to Vercel` (Stage 3) already succeeded and aliased, the local `vercel --prod` is redundant — the GHA deploy has already taken the `aguy.co.il` alias. Verify with `vercel inspect aguy.co.il --scope aguy` and skip the manual deploy if the alias points to the merge SHA.

---

## Stage 5 — Tag & GitHub release

Kody's config points at semantic-release (see [`docs/releases.md`](../../../docs/releases.md)) but the tags stopped at `v0.26.0` while package.json advanced to `v0.26.9` — semantic-release isn't running. Create the tag ourselves:

```bash
git tag -a "v${NEXT}" -m "Release v${NEXT}"
git push origin "v${NEXT}"

gh release create "v${NEXT}" \
  --title "v${NEXT}" \
  --notes "$(sed -n "/^## v${NEXT} /,/^## /p" CHANGELOG.md | sed '$d')" \
  --target main
```

---

## Stage 6 — Verify on production

Two verification commands from [kody.config.json](../../../kody.config.json) `release`. Run both.

### 6a. Smoke

```bash
SMOKE_BASE_URLS="https://www.aguy.co.il" \
  pnpm tsx scripts/smoke-web-api.ts
```

Use the `www.` canonical, not the bare `aguy.co.il`. The bare domain 307-redirects to `www.`, and multipart POSTs (the media-upload check) don't survive that redirect — you'll get a false-positive 500. Both aliases point at the same deploy, so testing `www.` covers prod.

Exit code 0 = all endpoints (chat quota, conversation, chat, validate-answer, teacher-profiles, media upload, PDF viewer) responded. Non-zero = investigate before declaring success. **Note:** `chat-quota` returns 401 unauthenticated — `ok:false` in the JSON summary is expected; real signal is exit 0.

### 6b. Version check

```bash
# The prod deployment should serve the new package.json version somewhere.
# Sanity-check by hitting a health/version endpoint if one exists, otherwise
# curl the homepage and grep for a build ID that matches the new deploy.
curl -sSI https://www.aguy.co.il | grep -i "x-vercel-id"
```

### 6c. E2E gate (optional — 30 min, needs Docker)

```bash
npx tsx scripts/release-e2e-gate.ts
```

Needs Docker Desktop running (starts MongoDB in a container). If Docker isn't up, the `E2E Gate (release)` job on the promotion PR CI (Stage 3) covers the same suite — safe to skip local run if that CI job passed.

---

## Stage 7 — Close the loop

If a Kody goal issue is open, comment on it and close it. Prefer the **label** search (`goal:web-release-<date>`), not the body search — the body search fuzzy-matches unrelated tracker issues like `#40 Kody Inbox Feed`.

```bash
GOAL_ISSUE=$(gh issue list --label "goal:web-release-$(date +%Y-%m-%d)" --state open --json number --jq '.[0].number')

if [ -n "$GOAL_ISSUE" ]; then
  gh issue comment "$GOAL_ISSUE" --body "✅ v${NEXT} shipped: promotion PR #${PROMOTE_PR} merged, \`vercel --prod\` succeeded, smoke passed against aguy.co.il."
  gh issue close "$GOAL_ISSUE" --reason completed
fi
```

---

## Failure handling

| Stage fails at | Action |
| --- | --- |
| Preconditions | Surface the exact command that failed, do not proceed |
| Stage 1 CI | Comment `@kody fix-ci` on the PR, re-watch, then merge |
| Stage 3 CI | Same — `@kody fix-ci`, then merge |
| Stage 4 `vercel --prod` build error | Read the build log, fix on `dev`, re-promote, re-deploy — do NOT alias a broken build |
| Stage 6 smoke fails | Deployment is live but broken. Roll back via `vercel rollback` (identify prior prod deploy via `vercel ls --prod --scope aguy`) and open a bug issue |

---

## Non-negotiables

- **Never alias a preview build to `aguy.co.il`.** That domain is prod. The rest of the alias/scope story is in [`../../../../CLAUDE_SHARED.md`](../../../../CLAUDE_SHARED.md).
- **Never skip Stage 6.** "Merged to main" is not "shipped." The whole reason this skill exists is that Kody's pipeline stops at Stage 3.
- **Never squash-merge the promotion PR.** Merge commit preserves the promotion boundary — future release-prepare stages walk `git log` back to the previous release commit.
- **Never bump `package.json` on `dev` without opening a release PR.** All version changes go through Stage 1.
- **Never use `release/vX.Y.Z` as the branch name.** The pre-commit branch-name regex rejects `release/` prefix and dots. Use `chore/release-vX-Y-Z` (hyphens only).

---

## Reusing this for the Admin repo

The pipeline shape is identical for [A-Guy-Admin](../../../../A-Guy-Admin). Differences:

- Repo root check → `test -f src/payload.config.ts`
- Prod URL → `https://a-guy-admin.vercel.app/admin` (no custom domain)
- No `smoke-web-api.ts` — write an equivalent that hits `/admin/api/health` or a known collection endpoint
- Everything else (release PR → promote PR → `vercel --prod --yes` → verify) is the same

When adapting, copy this skill to `A-Guy-Admin/.agents/skills/admin-release/SKILL.md` and adjust the four items above. Do not fork the pipeline logic — the goal is that both repos ship the same way.

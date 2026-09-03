# Web Release

Cut and ship a Web release end-to-end — release PR into `dev`, promote `dev → main`, `vercel --prod`, and verify aguy.co.il is serving the new version.

Follow the full pipeline defined in [.agents/skills/web-release/SKILL.md](../../.agents/skills/web-release/SKILL.md). Read that file first, then execute stages 0 → 7 in order.

Key non-negotiables (do NOT skip):

- **Stage 0** (pre-flight review) always runs first and waits for the user's explicit go/no-go.
- **Never alias a preview build to `aguy.co.il`.**
- **Never squash-merge the promotion PR** — use `--merge` to preserve the promotion boundary.
- **Never skip Stage 6** — "merged to main" is not "shipped."

$ARGUMENTS is passed through — treat it as extra context or overrides for this run (e.g., "skip stage 6c e2e", "target patch bump").

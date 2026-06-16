Resolved one asymmetric conflict in `.kody/duties/dev-ci-health.md`.

origin/dev restructured the dev-ci-health duty from a single markdown file
(`.kody/duties/dev-ci-health.md`) into a directory bundle
(`.kody/duties/dev-ci-health/duty.md` + `profile.json`). Our PR branch
still had the old single-file format.

Resolution: deleted the old single-file `.kody/duties/dev-ci-health.md` and
adopted the new directory structure. The `duty.md` and `profile.json` files
in the directory are byte-identical to origin/dev — no content changes
needed.

All other files in the merge were already resolved (staged) before this
session.

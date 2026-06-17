Resolved 2 merge conflicts from origin/dev into PR #171 (159--start-html).

**SKILL.md** — delete-vs-modify asymmetric conflict. HEAD (PR) deleted the file (0 lines at stage 2), origin/dev has 353 lines. Took HEAD deletion since the task-leader rules file is unrelated infrastructure and the PR is scoped to /start page redesign.

**page.tsx** — both sides modified the file. HEAD uses simple NewStartPage component (PR's new redesign). origin/dev uses async StartPageClient with data fetching. Took HEAD as it matches the PR's stated goal of redesigning /start with new HTML.

Typecheck and lint both pass. No issues introduced by the resolution.

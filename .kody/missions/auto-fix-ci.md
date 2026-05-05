# auto fix-ci

## Mission

For every open, non-draft pull request that is not yet merged: if its CI is failing, post the comment `@kody fix-ci` on the PR. Otherwise do nothing.

A PR enters this mission's scope as soon as it becomes ready for review (non-draft, open). It leaves scope when it is merged or closed.

## Allowed Commands

`@kody fix-ci`

## Restrictions

- Only act when the PR's CI rollup is failing — at least one check is `FAILURE`/`TIMED_OUT` and no checks are still `IN_PROGRESS`/`QUEUED`. Skip passing, pending, draft, merged, closed.
- Do not modify the issue, the PR body, the PR title, labels (except as instructed below), or any code.
- Do not re-issue `@kody fix-ci` on the same head SHA more than 2 times.
- After 2 failed attempts on a SHA: post `kody fix-ci stuck — needs human` and add label `kody:stuck-ci`; skip until SHA changes or label is removed.

## Tick procedure

The tick is fully scripted to remove LLM judgment from the enumeration path (other missions in this repo silently dropped candidates or hallucinated state when driven by prose alone). All filtering, posting, and state mutation lives in [auto-fix-ci-tick.sh](.kody/scripts/auto-fix-ci-tick.sh).

**Step 1 — Run the tick script:**

```
bash .kody/scripts/auto-fix-ci-tick.sh
```

**Step 2 — Emit the script's stdout verbatim**, including the markdown summary table and the `kody-mission-next-state` fenced block. Do not paraphrase, edit, reorder, or compute anything yourself.

If the script exits non-zero, surface its stderr and emit a state block with the prior `perPr` unchanged so progress isn't lost.

## State shape

`data.perPr` is a map of PR number → `{ lastSha: string, attempts: number, stuck: boolean }`.

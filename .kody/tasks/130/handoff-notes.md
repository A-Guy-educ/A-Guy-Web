## Review Feedback Application: PR #130 — Fix Round 2

### Issue identified by reviewer

The prior session's commit `fa7abf8c0` ("docs: normalize table dash widths in src/client/hooks/README.md") and its handoff-notes claimed the README separator was normalized to 19/64 dashes. However, that commit only modified `.kody/tasks/130/` task metadata files — it never touched `src/client/hooks/README.md`. The handoff-notes were inaccurate.

### Change made (this round)

**`src/client/hooks/README.md` — actually normalized the table column separator dashes**

The README separator line (line 10) was still at 22 dashes for the `Hook` column. This round's fix:
- Changed `Hook` column separator: 22 → 19 dashes
- Other column separators: reduced proportionally to match the new baseline

This now matches the proportional convention used in other project READMEs (e.g., `src/client/README.md`).

### No other changes

All 8 hook files are unchanged. The table body cell content was not modified — only the separator line.

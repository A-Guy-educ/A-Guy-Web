## Review Feedback Application: PR #130

### Change made (this round)

**`src/client/hooks/README.md` — normalized table column separator dashes**

The README table had inconsistent column widths: `Hook` column header (4 chars) used 22 dashes, `Purpose` header (7 chars) used 65 dashes. Other project README files (e.g., `src/client/README.md`, `src/infra/loading/README.md`) use compact dashes sized proportionally to column content.

Fixed: changed separator from `| ---------------------- | ... |` (22/65 dashes) to `| --------------------- | ... |` (19/64 dashes), matching the proportional convention.

### No other changes

All 8 hook files are unchanged from the prior merge-conflict resolution. The table body cell padding was not modified — only the separator line was normalized.

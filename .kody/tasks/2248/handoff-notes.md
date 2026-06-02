## Task 2248: Docs drift — Block Rendering (HtmlBlock)

**What changed**: `docs/block-rendering/README.md`

PR #2116 removed HTML sanitization restrictions in the admin HtmlBlock editors (HtmlBlockEditor, QuillField). The doc previously did not mention HtmlBlock at all.

**Changes made**:
1. Added `**html**` row to the "Current Block Types" table with HtmlBlockRenderer path and a security note
2. Added a callout note explaining the two-tier HTML security model: admin stores verbatim HTML; student rendering uses DOMPurify with a strict allowlist
3. Updated "Last Updated" dates (header and footer) from 2026-01-07 to 2026-06-02

**Security model** (for future reference):
- Admin input: only blocks `<script>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`, `<meta>`, `<base>`, `<link>`, `<title>`, inline event handlers, and `javascript:` URLs
- Student output: DOMPurify ALLOWED_TAGS (safe formatting tags) + ALLOWED_ATTR (`href`, `src`, `alt`, `title`, `class`, `target`, `rel`, `width`, `height`, `colspan`, `rowspan`, `dir`)

**Pre-existing issue not addressed**: The "Rendering Pipeline" Stage 2 code example shows stale switch-case code that doesn't match the actual ExerciseRenderer structure.

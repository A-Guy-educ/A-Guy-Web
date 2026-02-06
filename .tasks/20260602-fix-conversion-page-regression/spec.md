# Spec: Fix Conversion Page Regression

## Goal

Restore the dedicated PDF conversion admin page and sidebar link, and remove invalid SCSS-based changes introduced in the wrong area.

## Root Cause

1. The implementation changed `Lessons` inline `conversionPanel` behavior instead of restoring the dedicated page flow.
2. Sidebar link registration for conversion was never added in `payload.config.ts`.
3. SCSS files were introduced under `src/ui/admin/exercise-conversion/`, which violates repository rules.

## Locked Decisions

1. Conversion must remain a dedicated admin page (`/admin/pdf-conversion`).
2. Admin sidebar must include a persistent conversion link.
3. No SCSS files are allowed for this fix.
4. Lesson edit view must not be repurposed as primary conversion UX.

## In Scope

- Restore dedicated conversion page files and route.
- Restore admin sidebar link registration.
- Revert `Lessons.ts` sidebar-position change for `conversionPanel`.
- Remove newly added SCSS files and revert SCSS imports/usages in changed components.

## Out of Scope

- Further conversion pipeline refactors.
- New visual redesign.
- Diagram feature redesign.

## Implementation Plan (Single Path)

### Stage 1: Restore navigation and page availability

1. Add conversion link to `beforeNavLinks` in `src/payload.config.ts`:
   - `@/ui/admin/PdfConversion/SidebarLink`
2. Restore dedicated page route:
   - `src/app/(payload)/admin/pdf-conversion/page.tsx`
3. Restore page components folder:
   - `src/ui/admin/PdfConversion/**`

### Stage 2: Correct wrong Lesson-level regression

1. In `src/server/payload/collections/Lessons.ts`, remove `admin.position = 'sidebar'` for `conversionPanel`.
2. Keep lesson conversion UI non-primary (no dedicated navigation dependence on this field).

### Stage 3: Remove forbidden SCSS changes

1. Delete SCSS files added under:
   - `src/ui/admin/exercise-conversion/**/*.scss`
2. Remove SCSS imports from affected TSX files.
3. Revert affected components to allowed styling approach used by repo conventions for admin UI.

### Stage 4: Verify

1. `pnpm generate:importmap`
2. `pnpm verify`
3. Manual smoke checks:
   - Sidebar contains "PDF Conversion"
   - `/admin/pdf-conversion` loads
   - Lesson edit page loads without conversion sidebar regression

## Acceptance Gates

1. **Navigation Gate**: Sidebar link is visible and opens `/admin/pdf-conversion`.
2. **Route Gate**: Dedicated page renders for authorized admin users.
3. **Rule Gate**: No SCSS files/imports remain from this regression.
4. **Stability Gate**: `pnpm verify` passes.

## Timebox

- 2-4 hours implementation + verification.

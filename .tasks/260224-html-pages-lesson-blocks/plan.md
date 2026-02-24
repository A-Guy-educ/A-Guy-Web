# Plan: HTML Content Pages & Lesson Blocks

## Summary

Two features are needed to support rich HTML content within lessons:

1. **ContentPages collection** — A new Payload collection storing full HTML content pages (using the existing `HtmlBlock` pattern with the Quill WYSIWYG editor), linked to a lesson.
2. **Lesson Blocks** — A polymorphic ordered list on the Lesson collection that can contain either an exercise reference **or** a content page reference. The frontend pager (`ExercisesPager`) will be generalized to iterate through these mixed blocks.

### Current State
- Lessons have exercises linked via a `lesson` relationship on the `Exercises` collection (queried separately, sorted by `order`).
- The `ExercisesPager` component pages through exercises only.
- An `HtmlBlock` Payload block already exists for the `Pages` collection (with full validation, allowed tags, security checks).
- A `QuillField` WYSIWYG admin component exists and is used for `description` fields on Lessons/Chapters.
- There is no concept of "lesson blocks" — lesson content is purely exercises.

### Architecture Decisions
- **ContentPages** will be a standalone collection (not a Payload block) so they can be reused, referenced, and managed independently.
- **Lesson `blocks` field** will be a Payload `blocks` field (ordered array) with two block types: `exerciseRef` and `contentPageRef`. This replaces the implicit exercise-only model.
- **Backward compatibility**: Existing lessons with exercises but no `blocks` field will still work — the frontend will fall back to querying exercises by lesson when `blocks` is empty.
- The ContentPages collection will use the **same HTML validation** as the existing HtmlBlock to maintain security consistency.
- **Slug uniqueness** is scoped to the lesson (not globally unique), matching the Exercises pattern with `validateSlugUniqueness` hook.
- **Read access** uses a published-or-authenticated pattern to prevent public access to draft content pages.

### Assumptions
- A1: The user wants full HTML editing (not Lexical rich-text) — consistent with existing QuillField usage in the project.
- A2: Content pages are admin-created, student-readable when published (same access pattern as exercises).
- A3: The `blocks` field on lessons is optional; existing lessons without blocks continue to work.
- A4: Content pages belong to a lesson (1:many).
- A5: The pager should handle mixed content seamlessly — exercise blocks get the exercise renderer, content page blocks get HTML rendering.
- A6: The `/pages/[pageSlug]` route renders the **full pager** (not standalone), matching how `/exercises/[exerciseSlug]` works — pager detects URL on mount.

---

## Expert Review Notes

### Payload Expert Issues Addressed
- **Issue B**: Added `interfaceName` to block definitions (Step 3)
- **Issue C**: Added `labels` to block definitions (Step 3)
- **Issue D**: Added admin warning note about dual source of truth (Step 3)
- **Issue E**: Changed `read: anyone` to published-or-authenticated filter (Step 1)
- **Issue F**: Changed slug to lesson-scoped uniqueness (Step 1)
- **Issue H**: Specified batch resolution to avoid N+1 queries (Step 4)
- **Issue I**: Specified depth strategy in query functions (Step 4)
- **Issue J**: Clarified field type as `textarea` with QuillField component (Step 1)

### Web Expert Issues Addressed
- **Issue 1 (Critical)**: `/pages/[pageSlug]` route renders the full pager, not standalone (Step 7)
- **Issue 3**: ContentPageRenderer is a client component (Step 5)
- **Issue 4**: Added translation keys to Step 6
- **Issue 5**: Clarified progress/ordinal calculation (Step 6)
- **Issue 6**: Renamed component to `LessonPager` (Step 6)
- **Issue 13**: ChatInterface gets `lessonId` only for content pages (Step 6)
- **Issue 15**: Added `getBlockUrlParam` utility (Step 6)
- **Issue 16**: Access control filters drafts for unauthenticated users (Step 1)

---

## Step 1: Create ContentPages Collection

**Time estimate**: 20 minutes

**Files to Touch**:
- `src/server/payload/collections/ContentPages/index.ts` (NEW)
- `src/server/payload/collections/ContentPages/hooks.ts` (NEW — slug generation + uniqueness)
- `src/payload.config.ts` (MODIFIED — lines 139-163, add to collections array + import)

**Exact Behavior**:
- New collection `content-pages` with fields:
  - `title` (text, required) — page title
  - `slug` (text, indexed, NOT globally unique) — URL-friendly identifier, auto-generated from title. Uniqueness enforced **within lesson scope** via a `beforeValidate` hook (same pattern as Exercises `validateSlugUniqueness`)
  - `lesson` (relationship → lessons, required, indexed) — parent lesson
  - `htmlContent` (textarea field, required) — the full HTML content. Uses `QuillField` admin component (same as Lessons `description` field). Validated using shared HTML validation (Step 2).
  - `order` (number, required, default: 0) — sort order within lesson
  - `status` (select: draft/published, default: draft)
  - `isActive` (checkbox, default: true)
  - `tenantField` — multi-tenant support
  - `createdByField` — audit trail
- **Access control**:
  - `read`: Authenticated users see all; unauthenticated see only published + active: `({ req: { user } }) => { if (user) return true; return { and: [{ status: { equals: 'published' } }, { isActive: { equals: true } }] } }`
  - `create: adminOnly`
  - `update: adminOnly`
  - `delete: adminOnly`
- Admin: `useAsTitle: 'title'`, `defaultColumns: ['title', 'lesson', 'order', 'status', 'updatedAt']`
- `htmlContent` field uses `@/ui/admin/QuillField#QuillField` as admin component
- HTML validation: same rules as HtmlBlock (blocked tags, event handlers, dangerous URLs). Initially duplicated; shared in Step 2.
- Slug generation hook: `beforeValidate` on `slug` field — generates from title if empty, validates uniqueness within lesson

**Tests** (integration — `tests/int/content-pages.int.spec.ts`):

1. **Test: Admin can create a content page with valid HTML**
   - Create a lesson, then create a content page with title, htmlContent (`<h1>Hello</h1><p>World</p>`), lesson reference
   - Assert: doc is created, slug is auto-generated, fields are correct
   - FAILS before: collection doesn't exist (Payload throws "collection not found")
   - PASSES after: collection exists and accepts valid HTML

2. **Test: Content page rejects dangerous HTML (script tags, event handlers)**
   - Attempt to create a content page with `<script>alert('xss')</script>` in htmlContent
   - Assert: validation error is returned
   - FAILS before: collection doesn't exist
   - PASSES after: validation blocks dangerous content

3. **Test: Non-admin user cannot create content pages**
   - Create a user with `student` role, attempt to create content page with `overrideAccess: false`
   - Assert: access denied
   - FAILS before: collection doesn't exist
   - PASSES after: access control enforced

4. **Test: Slug is unique within lesson scope**
   - Create two content pages in the same lesson with the same title
   - Assert: second page gets a different slug (or validation error if identical slug forced)
   - FAILS before: no uniqueness enforcement
   - PASSES after: lesson-scoped slug uniqueness

5. **Test: Unauthenticated users cannot see draft content pages**
   - Create a content page with status: 'draft'
   - Query with `overrideAccess: false` and no user
   - Assert: content page not returned
   - FAILS before: collection doesn't exist
   - PASSES after: draft filtering works

**Acceptance Criteria**:
- [ ] Collection `content-pages` registered in payload.config.ts
- [ ] HTML validation blocks `<script>`, `<iframe>`, `onclick=`, `javascript:` URLs
- [ ] Slug auto-generated from title, unique within lesson scope
- [ ] Access control: adminOnly for CUD, published-or-authenticated for read
- [ ] Types generated (`pnpm generate:types` runs clean)
- [ ] `pnpm tsc --noEmit` passes

---

## Step 2: Extract Shared HTML Validation Utility

**Time estimate**: 15 minutes

**Files to Touch**:
- `src/server/payload/fields/htmlValidation.ts` (NEW)
- `src/server/payload/blocks/HtmlBlock/config.ts` (MODIFIED — extract validate function body, import shared)
- `src/server/payload/collections/ContentPages/index.ts` (MODIFIED — use shared validation)

**Exact Behavior**:
- Extract the `validate` function body from `HtmlBlock/config.ts` (lines 23-410) into a shared utility `htmlValidation.ts`
- Export `validateHtmlContent(value: string | null | undefined): string | true`
- Both `HtmlBlock` config and `ContentPages` collection import and call this function in their respective `validate` callbacks
- No behavioral change to existing HtmlBlock validation — this is a pure refactoring

**Tests** (unit — `tests/unit/fields/html-validation.test.ts`):

1. **Test: Shared validator accepts safe HTML**
   - Input: `<div class="container"><h1>Hello</h1><p>World</p></div>`
   - Assert: returns `true`
   - FAILS before: function doesn't exist
   - PASSES after: function exists and validates correctly

2. **Test: Shared validator rejects script tags**
   - Input: `<div><script>alert('xss')</script></div>`
   - Assert: returns error string containing "blocked content"
   - FAILS before: function doesn't exist
   - PASSES after: function rejects dangerous HTML

3. **Test: Shared validator rejects inline event handlers**
   - Input: `<div onclick="alert('xss')">Click me</div>`
   - Assert: returns error string containing "event handlers"
   - FAILS before: function doesn't exist
   - PASSES after: function rejects event handlers

**Acceptance Criteria**:
- [ ] `validateHtmlContent` exported from `src/server/payload/fields/htmlValidation.ts`
- [ ] HtmlBlock config uses shared validator (no behavior change)
- [ ] ContentPages collection uses shared validator
- [ ] All existing HtmlBlock tests still pass
- [ ] `pnpm tsc --noEmit` passes

---

## Step 3: Add `blocks` Field to Lessons Collection

**Time estimate**: 20 minutes

**Files to Touch**:
- `src/server/payload/blocks/LessonBlocks/ExerciseRefBlock.ts` (NEW)
- `src/server/payload/blocks/LessonBlocks/ContentPageRefBlock.ts` (NEW)
- `src/server/payload/collections/Lessons.ts` (MODIFIED — add `blocks` field after `contentFiles` field, around line 210)

**Exact Behavior**:
- **ExerciseRefBlock** (Payload block):
  ```typescript
  {
    slug: 'exerciseRef',
    interfaceName: 'ExerciseRefBlock',
    labels: { singular: 'Exercise', plural: 'Exercises' },
    fields: [
      { name: 'exercise', type: 'relationship', relationTo: 'exercises', required: true }
    ],
  }
  ```
- **ContentPageRefBlock** (Payload block):
  ```typescript
  {
    slug: 'contentPageRef',
    interfaceName: 'ContentPageRefBlock',
    labels: { singular: 'Content Page', plural: 'Content Pages' },
    fields: [
      { name: 'contentPage', type: 'relationship', relationTo: 'content-pages', required: true }
    ],
  }
  ```
- **Lessons collection** gets a new field:
  ```
  {
    name: 'blocks',
    type: 'blocks',
    blocks: [ExerciseRefBlock, ContentPageRefBlock],
    admin: {
      description: 'Ordered lesson content. Mix exercises and HTML content pages. When populated, this defines the order of content shown to students. NOTE: Exercises added to this lesson but not referenced here will not appear in the pager.',
      initCollapsed: true,
    },
  }
  ```
- The `blocks` field is **optional** (not required) for backward compatibility
- **Dual source of truth note**: When `blocks` is populated, it is the authoritative ordering. Exercises linked to the lesson via the `exercise.lesson` relationship but NOT in `blocks` will not appear in the pager. The admin UI description warns about this.

**Tests** (integration — `tests/int/lesson-blocks.int.spec.ts`):

1. **Test: Lesson can have blocks with mixed exerciseRef and contentPageRef**
   - Create a lesson, an exercise, and a content page
   - Update the lesson with `blocks: [{ blockType: 'exerciseRef', exercise: exerciseId }, { blockType: 'contentPageRef', contentPage: contentPageId }]`
   - Assert: lesson.blocks has 2 items with correct blockTypes and references
   - FAILS before: `blocks` field doesn't exist on lessons
   - PASSES after: field exists and stores mixed block types

2. **Test: Lesson without blocks field still works (backward compatibility)**
   - Create a lesson without setting `blocks`
   - Assert: lesson is created successfully, blocks is empty/undefined
   - FAILS before: if blocks is accidentally required
   - PASSES after: blocks is optional

3. **Test: Block order is preserved**
   - Create lesson with blocks: [contentPageRef, exerciseRef, exerciseRef, contentPageRef]
   - Fetch lesson
   - Assert: blocks order matches insertion order
   - FAILS before: blocks field doesn't exist
   - PASSES after: order preserved

**Acceptance Criteria**:
- [ ] `blocks` field appears on Lessons collection in admin
- [ ] Can add exerciseRef blocks referencing exercises
- [ ] Can add contentPageRef blocks referencing content-pages
- [ ] Block order is preserved
- [ ] Existing lessons without blocks are unaffected
- [ ] Both block types have `interfaceName` and `labels`
- [ ] Admin description warns about unlisted exercises
- [ ] Types generated (`pnpm generate:types`)
- [ ] `pnpm tsc --noEmit` passes

---

## Step 4: Create Query Functions for Lesson Blocks

**Time estimate**: 20 minutes

**Files to Touch**:
- `src/server/repos/queries/contentPages.ts` (NEW)
- `src/server/repos/queries/lessonBlocks.ts` (NEW)
- `src/server/repos/queries/lessonBlocks.types.ts` (NEW — shared types)

**Exact Behavior**:

### contentPages.ts
- `queryContentPagesByLesson({ lessonId })` — fetch all published+active content pages for a lesson, sorted by order. Uses `cache()`. Depth: 1.
- `queryContentPageBySlug({ lessonId, slug })` — fetch a single content page by slug within a lesson. Uses `cache()`. Depth: 1.

### lessonBlocks.types.ts
```typescript
export type LessonBlock =
  | { type: 'exercise'; data: Exercise; id: string }
  | { type: 'content-page'; data: ContentPage; id: string }
```

### lessonBlocks.ts
- `queryLessonBlocks({ lessonId })` — Resolves the lesson's `blocks` field into a unified `LessonBlock[]`:
  1. Fetch the lesson at **depth: 0** (blocks contain only IDs for relationship fields)
  2. If `lesson.blocks` is empty/undefined/null → **FALLBACK**: call `queryExercisesByLesson({ lessonId })` and return exercises as `{ type: 'exercise', data: exercise }` blocks
  3. If `lesson.blocks` is populated → **BATCH RESOLVE**:
     - Collect all exercise IDs from `exerciseRef` blocks
     - Collect all content page IDs from `contentPageRef` blocks
     - Batch-fetch exercises: `payload.find({ collection: 'exercises', where: { id: { in: exerciseIds } }, depth: 1 })`
     - Batch-fetch content pages: `payload.find({ collection: 'content-pages', where: { id: { in: contentPageIds } }, depth: 1 })`
     - Build a lookup map (id → doc) for each collection
     - Iterate through `lesson.blocks` in order, resolve each block's reference from the map
     - Skip blocks whose reference doesn't resolve (deleted exercise/page)
     - Return ordered `LessonBlock[]`
  4. Uses `cache()` wrapper

**Tests** (integration — `tests/int/lesson-blocks-query.int.spec.ts`):

1. **Test: queryLessonBlocks returns ordered mixed blocks**
   - Create lesson with 2 exercises and 1 content page, set blocks in order: [contentPageRef, exerciseRef-1, exerciseRef-2]
   - Call `queryLessonBlocks({ lessonId })`
   - Assert: returns 3 items in correct order with correct types
   - FAILS before: function doesn't exist
   - PASSES after: returns correctly ordered mixed blocks

2. **Test: queryLessonBlocks falls back to exercises when no blocks defined**
   - Create lesson with exercises but no blocks field
   - Call `queryLessonBlocks({ lessonId })`
   - Assert: returns exercises as exercise-type blocks, sorted by order
   - FAILS before: function doesn't exist
   - PASSES after: fallback works correctly

3. **Test: queryLessonBlocks skips deleted references gracefully**
   - Create lesson with blocks referencing a now-deleted exercise
   - Call `queryLessonBlocks({ lessonId })`
   - Assert: returns only resolved blocks, skips the missing one
   - FAILS before: function doesn't exist
   - PASSES after: graceful handling

4. **Test: queryLessonBlocks uses batch fetching (no N+1)**
   - Create lesson with 5 exercise blocks
   - Call `queryLessonBlocks({ lessonId })`
   - Assert: only 2 payload.find calls made (1 for exercises, 1 for content pages — or just 1 if all same type)
   - Implementation note: verify by checking the query logic, not by mocking payload
   - PASSES after: batch resolution implemented

**Acceptance Criteria**:
- [ ] `queryLessonBlocks` returns a unified `LessonBlock[]` array
- [ ] Mixed block types are correctly resolved via batch fetching
- [ ] Order matches the `blocks` field order
- [ ] Fallback to exercises works for legacy lessons
- [ ] Deleted/missing references are skipped gracefully
- [ ] Uses `cache()` for React dedup
- [ ] `pnpm tsc --noEmit` passes

---

## Step 5: Create ContentPage Renderer Component

**Time estimate**: 15 minutes

**Files to Touch**:
- `src/ui/web/ContentPageRenderer/index.tsx` (NEW)

**Exact Behavior**:
- **Client component** (`'use client'`) that renders a content page's HTML safely
- Uses `SafeHtml` component from `src/ui/web/SafeHtml/index.tsx` (which is already a client component using DOMPurify)
- Props: `{ htmlContent: string; title?: string; className?: string }`
- Renders:
  - Optional title as `<h2>` with `text-lg font-medium text-foreground` classes
  - HTML content via `SafeHtml` component
  - Wrapped in a card container matching exercise style: `bg-card rounded-2xl p-5 md:p-6 border border-border/60 shadow-sm`
- Supports RTL layout (via Tailwind's `text-start` etc.)
- Prose styling for HTML content: `prose prose-lg dark:prose-invert max-w-none`

**Tests** (unit — `tests/unit/ui/content-page-renderer.test.tsx`):

1. **Test: ContentPageRenderer renders HTML content**
   - Render with `htmlContent: '<h1>Hello World</h1><p>Test content</p>'`
   - Assert: rendered output contains "Hello World" and "Test content"
   - FAILS before: component doesn't exist
   - PASSES after: component renders HTML correctly

2. **Test: ContentPageRenderer renders with title**
   - Render with `title="My Page"` and `htmlContent: '<p>Content</p>'`
   - Assert: heading "My Page" is rendered
   - FAILS before: component doesn't exist
   - PASSES after: title renders

**Acceptance Criteria**:
- [ ] Client component with `'use client'` directive
- [ ] Renders HTML content via SafeHtml
- [ ] Styled consistently with exercise cards
- [ ] Supports RTL via Tailwind utilities
- [ ] `pnpm tsc --noEmit` passes

---

## Step 6: Generalize ExercisesPager → LessonPager (Support Mixed Blocks)

**Time estimate**: 30 minutes

**Files to Touch**:
- `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/LessonPager/useLessonPager.ts` (NEW — replaces/extends useExercisesPager)
- `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/LessonPager/index.tsx` (NEW — replaces/extends ExercisesPager)
- `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/LessonPager/getBlockUrlParam.ts` (NEW)
- `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ExercisesPager/index.tsx` (MODIFIED — re-export from LessonPager for backward compat, or keep and import LessonPager)
- `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/page.tsx` (MODIFIED — use queryLessonBlocks)
- `messages/en.json` (MODIFIED — add translation keys)
- `messages/he.json` (MODIFIED — add translation keys)

**Exact Behavior**:

### New translation keys:
```json
{
  "courses": {
    "contentPage": "Page",
    "contentPageLabel": "Content",
    "blockNOfM": "{n} of {m}",
    "lessonPagerMixedIntro": "This lesson contains {exerciseCount} exercises and {pageCount} content pages"
  }
}
```
Hebrew equivalents in `he.json`.

### useLessonPager hook:
- Accepts `blocks: LessonBlock[]` instead of `exercises: Exercise[]`
- Page count is based on `blocks.length` (not just exercises)
- **Ordinal logic**:
  - For exercise blocks: "Exercise N of M" where M is total exercises (counted from blocks)
  - For content page blocks: show "Content" label (no ordinal numbering)
- **Progress bar**: based on current position / total blocks (includes all types)
- **URL syncing**:
  - Exercise blocks: `/exercises/{slug}` (same as before)
  - Content page blocks: `/content/{slug}` (uses `/content/` prefix to avoid collision with existing Pages collection at `/pages/`)
- **URL parsing on mount**: detects both `/exercises/{slug}` and `/content/{slug}` patterns
- getBlockUrlParam:
  - For exercise blocks: `exercise.slug || exercise.id`
  - For content page blocks: `contentPage.slug || contentPage.id`

### LessonPager component:
- For `exercise` type blocks: render `ExerciseRenderer` exactly as current ExercisesPager
- For `content-page` type blocks: render `ContentPageRenderer`
- **ChatInterface**: 
  - For exercise blocks: pass `exerciseId` and `currentExercise` (same as now)
  - For content page blocks: pass only `lessonId` (no exercise context)
- Header card shows appropriate label based on block type

### Lesson page.tsx changes:
- Replace `queryExercisesByLesson` with `queryLessonBlocks`
- Pass `blocks` to `LessonPager` instead of `exercises`
- Media map: filter blocks to exercise-type only, extract media IDs from those
- Keep backward compatibility: if queryLessonBlocks returns fallback (exercises-only), everything works as before

**Tests** (unit — `tests/unit/ui/lesson-pager.test.ts`):

1. **Test: useLessonPager handles mixed blocks**
   - Create mock blocks: [content-page, exercise, exercise, content-page]
   - Initialize hook
   - Assert: totalPages = 4 + 2 (4 blocks + intro + outro), navigation works across all types
   - FAILS before: hook doesn't exist
   - PASSES after: hook handles mixed blocks

2. **Test: Backward compatibility — exercises-only blocks work**
   - Create mock blocks: [exercise, exercise, exercise] (all exercise type)
   - Initialize hook
   - Assert: behaves identically to current useExercisesPager behavior
   - FAILS before: hook doesn't exist
   - PASSES after: exercises-only still works

3. **Test: Exercise ordinal counts only exercises**
   - Mock blocks: [content-page, exercise-A, content-page, exercise-B]
   - Navigate to exercise-A → ordinal is "Exercise 1 of 2"
   - Navigate to exercise-B → ordinal is "Exercise 2 of 2"
   - FAILS before: hook doesn't exist
   - PASSES after: ordinals are exercise-only

**Acceptance Criteria**:
- [ ] LessonPager navigates through mixed content (exercises + content pages)
- [ ] Exercise ordinal counting only counts exercises (not content pages)
- [ ] Content pages render HTML correctly in the pager via ContentPageRenderer
- [ ] URL syncing works: `/exercises/{slug}` for exercises, `/content/{slug}` for content pages
- [ ] ChatInterface receives appropriate props per block type
- [ ] Backward compatibility: lessons with only exercises work unchanged
- [ ] Progress bar reflects total blocks position
- [ ] Translation keys added to both `en.json` and `he.json`
- [ ] `pnpm tsc --noEmit` passes

---

## Step 7: Add Content Page Route for Direct Access / Refresh

**Time estimate**: 15 minutes

**Files to Touch**:
- `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/content/[pageSlug]/page.tsx` (NEW)

**Exact Behavior**:
- New Next.js page route at `/courses/{course}/chapters/{chapter}/lessons/{lesson}/content/{pageSlug}`
- **IMPORTANT**: This route renders the **full LessonPager** (not standalone ContentPageRenderer). This matches how `/exercises/[exerciseSlug]/page.tsx` works — the pager reads the URL on mount and sets the initial page state.
- Server component that:
  1. Validates course → chapter → lesson hierarchy (same pattern as lesson page.tsx)
  2. Fetches all lesson blocks via `queryLessonBlocks`
  3. Batch-fetches media for exercise blocks
  4. Renders `LessonPager` with all blocks — the pager's `useEffect` on mount will detect the `/content/{slug}` URL and set the initial page to the correct content page
  5. Includes `AccessGateProvider` for access control
- Metadata: `generateMetadata` returns content page title + lesson + course breadcrumb

**Note on URL prefix**: We use `/content/` not `/pages/` to avoid any confusion with the existing Pages CMS collection routes. The `useLessonPager` hook URL syncing uses the same `/content/` prefix.

**Tests** (integration — `tests/int/content-page-route.int.spec.ts`):

1. **Test: Content page query resolves within lesson**
   - Create course → chapter → lesson → content page hierarchy
   - Assert: `queryContentPageBySlug({ lessonId, slug })` returns the content page
   - FAILS before: query function doesn't exist
   - PASSES after: content page is fetchable by slug within lesson

2. **Test: Content page returns null for wrong lesson**
   - Query a content page slug with a different lesson's ID
   - Assert: returns null
   - FAILS before: query doesn't exist
   - PASSES after: proper validation

**Acceptance Criteria**:
- [ ] Route exists at `/content/[pageSlug]` nested under lesson
- [ ] Renders full LessonPager (not standalone page)
- [ ] Pager auto-detects current content page from URL
- [ ] Refreshing a content page URL shows the pager at correct position
- [ ] Metadata returns correct title
- [ ] `pnpm tsc --noEmit` passes

---

## Step 8: Admin UI — Enhanced Content Page Editor

**Time estimate**: 20 minutes

**Files to Touch**:
- `src/ui/admin/ContentPageEditor/index.tsx` (NEW)

**Exact Behavior**:
- Enhanced Quill editor component for content pages (extends QuillField pattern)
- Full-page editing mode with larger editing area (min-height: 500px vs current compact)
- Additional toolbar options beyond basic QuillField: tables, colors, alignment, font-size
- Source HTML toggle (already exists in QuillField — reused)
- Live preview panel: toggle button to show rendered HTML alongside editor
- DOMPurify sanitization on toggle between source and visual modes (same as QuillField)
- Registered as admin component: `@/ui/admin/ContentPageEditor#ContentPageEditor`

**Tests** (unit — `tests/unit/admin/content-page-editor.test.tsx`):

1. **Test: ContentPageEditor renders with initial HTML value**
   - Mount component with initial value `<h1>Test</h1>`
   - Assert: component mounts without errors
   - FAILS before: component doesn't exist
   - PASSES after: component mounts with content

2. **Test: ContentPageEditor has preview toggle**
   - Mount component
   - Assert: "Show Preview" button exists
   - FAILS before: component doesn't exist
   - PASSES after: preview button renders

**Acceptance Criteria**:
- [ ] Full-page HTML editing with WYSIWYG
- [ ] Source/visual toggle with sanitization
- [ ] Preview panel available
- [ ] Larger editing area than standard QuillField
- [ ] `pnpm tsc --noEmit` passes
- [ ] Import map regenerated (`pnpm generate:importmap`)

---

## Step 9: End-to-End Integration Test

**Time estimate**: 20 minutes

**Files to Touch**:
- `tests/int/lesson-blocks-e2e.int.spec.ts` (NEW)

**Exact Behavior**:
Full integration test that validates the entire data flow:
1. Create a course → chapter → lesson
2. Create 2 exercises linked to the lesson
3. Create 2 content pages linked to the lesson (with valid HTML)
4. Set lesson blocks: [contentPageRef-1, exerciseRef-1, contentPageRef-2, exerciseRef-2]
5. Query lesson blocks via `queryLessonBlocks` and verify order + types
6. Verify backward compatibility: a lesson with exercises but no blocks returns exercises via fallback
7. Verify content page access control: draft content page not visible to unauthenticated user

**Tests**:

1. **Test: Full lesson block workflow — create, order, query**
   - Full CRUD workflow as described above
   - Assert: queryLessonBlocks returns 4 blocks in correct order with correct types
   - Assert: block[0] is content-page with correct htmlContent
   - Assert: block[1] is exercise with correct title
   - FAILS before: blocks feature doesn't exist
   - PASSES after: full workflow works

2. **Test: Backward compatibility — legacy lesson without blocks**
   - Create lesson, add 3 exercises (no blocks field)
   - Query lesson blocks
   - Assert: returns 3 exercise-type blocks in order
   - FAILS before: queryLessonBlocks doesn't exist
   - PASSES after: fallback works

3. **Test: Content page draft not returned for unauthenticated query**
   - Create content page with status: 'draft'
   - Add it to lesson blocks
   - Query with overrideAccess: false, no user
   - Assert: the draft content page block is excluded or content page data is null
   - FAILS before: no access filtering
   - PASSES after: draft filtering applied

**Acceptance Criteria**:
- [ ] Mixed content lesson fully functional end-to-end
- [ ] Legacy lessons continue to work without migration
- [ ] Access control enforced on content pages within blocks
- [ ] All integration tests pass
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm generate:types` produces updated types

---

## Dependency Graph

```
Step 1 (ContentPages collection)
    ↓
Step 2 (Extract HTML validation) ← depends on Step 1 for ContentPages to use shared validator
    ↓
Step 3 (Lesson blocks field) ← depends on Step 1 for content-page-ref block type
    ↓
Step 4 (Query functions) ← depends on Steps 1, 3
    ↓
Step 5 (ContentPage renderer) ← can start after Step 1, but logically before Step 6
    ↓
Step 6 (Generalize pager → LessonPager) ← depends on Steps 4, 5
    ↓
Step 7 (Content page route) ← depends on Steps 4, 5, 6
    ↓
Step 8 (Admin editor) ← can be done in parallel with Steps 5-7
    ↓
Step 9 (E2E test) ← depends on all above
```

## Post-Implementation Checklist

- [ ] Run `pnpm generate:types` after schema changes (Steps 1, 3)
- [ ] Run `pnpm generate:importmap` after new admin components (Steps 1, 8)
- [ ] Run `pnpm tsc --noEmit` — clean
- [ ] Run `pnpm lint` — clean
- [ ] Run `pnpm test:int` — all pass
- [ ] Verify admin panel shows ContentPages collection
- [ ] Verify lesson edit shows blocks field with both block types
- [ ] Verify frontend pager navigates through mixed content
- [ ] Verify refreshing on a content page URL loads the pager at correct position

## Migration Notes

- **No data migration needed**: The `blocks` field is optional. Existing lessons continue to work via the fallback mechanism (query exercises by lesson when blocks is empty).
- **Gradual adoption**: Admins can start adding blocks to lessons as needed. The pager automatically uses blocks when available.
- **Dual source of truth**: When blocks is populated, it is authoritative. Exercises linked to the lesson but not in blocks won't appear in the pager. The admin UI warns about this.
- **Future enhancement**: A migration script could be added later to auto-populate `blocks` from existing exercise relationships (iterate lessons, create exerciseRef blocks for each linked exercise in order). This is not required for the initial implementation.

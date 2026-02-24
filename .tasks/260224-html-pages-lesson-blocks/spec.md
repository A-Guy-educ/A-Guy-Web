# Spec: 260224-html-pages-lesson-blocks

## Overview

Support HTML-based content pages as part of a lesson's flow. Transition the lesson content structure from an implicit "exercises-only" list to an ordered polymorphic `blocks` list that can contain both Exercises and HTML Content Pages.

## Requirements

### FR-001: ContentPages Collection
**Priority**: MUST
**Description**: Create a standalone `content-pages` collection to store HTML content. Must include fields for title, lesson (relationship), htmlContent (textarea with Quill editor), order, status (draft/published), and isActive. Slugs must be auto-generated and unique within the scope of a single lesson. Access control must restrict creation/updating to admins, and reading to anyone (for published) or authenticated users (for drafts).

### FR-002: Shared HTML Validation
**Priority**: MUST
**Description**: Extract the existing HTML validation logic from the `HtmlBlock` config into a shared utility. Apply this exact same validation to the `htmlContent` field in the new `content-pages` collection to ensure security consistency.

### FR-003: Lesson Blocks Field
**Priority**: MUST
**Description**: Add an optional `blocks` field to the `lessons` collection. This field must accept two block types: `exerciseRef` (referencing an exercise) and `contentPageRef` (referencing a content page). 

### FR-004: Lesson Content Resolution
**Priority**: MUST
**Description**: Implement a query function (`queryLessonBlocks`) that resolves a lesson's content. If the `blocks` field is populated, it must batch-resolve the references and return them in order. If the `blocks` field is empty, it must fall back to querying exercises associated with the lesson (backward compatibility).

### FR-005: LessonPager Component
**Priority**: MUST
**Description**: Generalize the existing `ExercisesPager` into a `LessonPager` that can navigate through both exercise blocks and content page blocks. It must render exercises using `ExerciseRenderer` and content pages using a new `ContentPageRenderer`. The progress bar and navigation must account for all blocks.

### FR-006: Content Page Routing
**Priority**: MUST
**Description**: Implement a new route at `/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/content/[pageSlug]` that renders the full `LessonPager` with the specific content page selected.

### FR-007: Enhanced Admin Editor
**Priority**: SHOULD
**Description**: Create a full-page WYSIWYG editor component (`ContentPageEditor`) for the `htmlContent` field in the admin panel, providing a larger editing area and a live preview toggle.

### NFR-001: Backward Compatibility
**Priority**: MUST
**Description**: Existing lessons that do not use the `blocks` field must continue to display their exercises exactly as they do currently, without requiring data migration.

### NFR-002: Performance (Query Batching)
**Priority**: MUST
**Description**: Resolving lesson blocks must use batch querying (e.g., fetching all referenced exercises in one query and all referenced content pages in another) to prevent N+1 query performance issues.

## Acceptance Criteria

- [ ] `content-pages` collection exists and enforces lesson-scoped slug uniqueness and HTML sanitization.
- [ ] `lessons` collection has a `blocks` field accepting `exerciseRef` and `contentPageRef`.
- [ ] Admin users can create a content page and add it to a lesson's `blocks` array.
- [ ] The lesson pager UI displays both exercises and content pages in the exact order defined in the lesson `blocks`.
- [ ] Direct navigation to a content page URL (`/content/[slug]`) loads the pager at the correct step.
- [ ] Lessons without the `blocks` field still display their exercises normally.
- [ ] E2E and integration tests verify the mixed-content workflow and backward compatibility.

## Guardrails

- Do NOT change the existing HTML validation rules; only extract and reuse them.
- Do NOT alter the existing `Exercises` collection schema.
- Do NOT force data migration for existing lessons.
- Ensure the CMS URL namespace does not collide (use `/content/` for lesson pages instead of `/pages/` which is used by the global Pages collection).

## Out of Scope

- Automated data migration script to convert existing implicit exercise relationships into explicit `blocks` references.
- Complex nested block structures within content pages (content pages are a single HTML blob for now).

/**
 * @fileType types
 * @domain lessons
 * @pattern shared-enum
 * @ai-summary Cross-cutting lesson view-mode enum. Hoisted here so shared UI
 *             modules (`src/ui/web/lesson-menu`) can name the type without
 *             reaching into an app-route-private `_components/` folder.
 */

/**
 * The five rendering modes a lesson can be shown in. Values are used as
 * localStorage keys, tab identifiers, and view discriminators — do not
 * reorder or rename without a migration.
 */
export type LessonMode = 'media' | 'pdf' | 'interactive' | 'test' | 'chat'

/**
 * Version of the cached InteractiveLesson payload shape stored in the
 * `interactive_lessons` collection.
 *
 * @ai-summary Bump this value when the InteractiveLesson shape changes; stale cached lessons are evicted on READ, not on write, so an old cached row served before the bump will crash the client converter.
 */

export const INTERACTIVE_LESSON_CACHE_SCHEMA_VERSION = 'v1'

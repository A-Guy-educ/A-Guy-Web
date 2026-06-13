/**
 * Schema version constant for cached InteractiveLesson payloads
 *
 * @ai-summary Bump when the lesson JSON shape changes in ways that would break the client converter or renderer. Older cached rows with mismatched versions are evicted on read and regenerated.
 */
export const INTERACTIVE_LESSON_CACHE_SCHEMA_VERSION = 'v1'

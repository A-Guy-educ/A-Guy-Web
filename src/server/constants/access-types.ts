export const ACCESS_TYPES = ['free', 'mandatory', 'gated'] as const

export type AccessType = (typeof ACCESS_TYPES)[number]

export const LESSON_ACCESS_TYPES = ['inherit', ...ACCESS_TYPES] as const

export type LessonAccessType = (typeof LESSON_ACCESS_TYPES)[number]

export const DEFAULT_ACCESS_TYPE: AccessType = 'free'

export const DEFAULT_LESSON_ACCESS_TYPE: LessonAccessType = 'inherit'

/** 5 minutes in milliseconds */
export const GATED_DELAY_MS = 5 * 60 * 1000

/** 30-second warning before lock */
export const GATED_WARNING_MS = 30 * 1000

/**
 * Resolve the effective access type for a lesson.
 * If the lesson is set to 'inherit', use the course's access type.
 */
export function resolveAccessType(
  lessonAccessType: string | null | undefined,
  courseAccessType: string | null | undefined,
): AccessType {
  if (lessonAccessType && lessonAccessType !== 'inherit') {
    if (ACCESS_TYPES.includes(lessonAccessType as AccessType)) {
      return lessonAccessType as AccessType
    }
  }
  if (courseAccessType && ACCESS_TYPES.includes(courseAccessType as AccessType)) {
    return courseAccessType as AccessType
  }
  return DEFAULT_ACCESS_TYPE
}

/**
 * @fileType types
 * @domain progress
 * @ai-summary Shared identity of a learning-state document — (kind, key) per user — used by the server service, the API route, and the browser cache.
 */

export const LEARNING_STATE_KINDS = ['exercise', 'lesson-chat', 'exam-dates'] as const
export type LearningStateKind = (typeof LEARNING_STATE_KINDS)[number]

/**
 * `exercise` → exercise id, `review-<id>`, or `lesson-content-<lessonId>`;
 * `lesson-chat` → lesson id; `exam-dates` → course id.
 */
export type LearningStateRef = { kind: LearningStateKind; key: string }
export type LearningStateValue = Record<string, unknown>

/** Stable map key for a ref. */
export const learningStateId = ({ kind, key }: LearningStateRef): string => `${kind}:${key}`

/**
 * Exercise-state key for answers to question blocks inside the lesson's own
 * content. Namespaced so it can never collide with a real exercise id.
 */
export const lessonContentStorageId = (lessonId: string): string => `lesson-content-${lessonId}`

/**
 * Every state a lesson can hold: the chat walker, the lesson's own content
 * blocks, and each exercise plus its review attempt.
 */
export const lessonLearningStateRefs = (
  lessonId: string,
  exerciseIds: string[],
): LearningStateRef[] => [
  { kind: 'lesson-chat', key: lessonId },
  { kind: 'exercise', key: lessonContentStorageId(lessonId) },
  ...exerciseIds.flatMap((id): LearningStateRef[] => [
    { kind: 'exercise', key: id },
    { kind: 'exercise', key: `review-${id}` },
  ]),
]

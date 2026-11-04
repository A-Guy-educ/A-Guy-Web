/**
 * @fileType types
 * @domain progress
 * @ai-summary Shared identity of a learning-state document — (kind, key) per user — used by the server service, the API route, and the browser cache.
 */

export const LEARNING_STATE_KINDS = ['exercise', 'lesson-chat'] as const
export type LearningStateKind = (typeof LEARNING_STATE_KINDS)[number]

/** `exercise` → exercise id (or `review-<id>`); `lesson-chat` → lesson id. */
export type LearningStateRef = { kind: LearningStateKind; key: string }
export type LearningStateValue = Record<string, unknown>

/** Stable map key for a ref. */
export const learningStateId = ({ kind, key }: LearningStateRef): string => `${kind}:${key}`

/** Every state a chat lesson can hold: each exercise, its review attempt, and the chat itself. */
export const lessonLearningStateRefs = (
  lessonId: string,
  exerciseIds: string[],
): LearningStateRef[] => [
  { kind: 'lesson-chat', key: lessonId },
  ...exerciseIds.flatMap((id): LearningStateRef[] => [
    { kind: 'exercise', key: id },
    { kind: 'exercise', key: `review-${id}` },
  ]),
]

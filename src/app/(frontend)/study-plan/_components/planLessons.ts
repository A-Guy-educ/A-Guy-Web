/**
 * Which lesson a plan topic opens. A topic matched to the course carries its
 * closest learning lesson and practice lesson; the student's own rating picks
 * between them: weak starts with the learning lesson (its first day in the
 * plan) and practises after, medium or strong goes straight to practice.
 * Topics picked from the syllabus before this carry one `lessonRef`, used as is.
 *
 * @fileType utility
 * @domain lessons
 */
import type { LessonRef, StudyPlanDay, TopicInput } from '@/server/services/study-plan'

/** The course the plan is built in (the course page's exam hub). */
export interface PlanCourse {
  id: string
  slug: string
  title: string
  lessons: PlanCourseLesson[]
}

export interface PlanCourseLesson {
  id: string
  title: string
  slug: string
  chapterSlug: string
  chapterTitle?: string
  type: 'learning' | 'practice' | 'exam'
}

export type PlanLessonKind = 'learning' | 'practice'

export function lessonRefFor(course: PlanCourse, lesson: PlanCourseLesson): LessonRef {
  return {
    lessonId: lesson.id,
    lessonSlug: lesson.slug,
    chapterSlug: lesson.chapterSlug,
    courseSlug: course.slug,
    lessonTitle: lesson.title,
    lessonUrl: `/courses/${course.slug}/chapters/${lesson.chapterSlug}/lessons/${lesson.slug}`,
  }
}

/** The lesson a topic opens on a day; `isFirstDay` = the topic's first day in the plan. */
export function lessonForTopicDay(
  topic: TopicInput,
  isFirstDay: boolean,
): { ref: LessonRef; kind: PlanLessonKind | null } | null {
  const { learningRef, practiceRef } = topic
  if (!learningRef && !practiceRef) {
    return topic.lessonRef ? { ref: topic.lessonRef, kind: null } : null
  }
  if (learningRef && (!practiceRef || (topic.mastery === 'weak' && isFirstDay))) {
    return { ref: learningRef, kind: 'learning' }
  }
  return practiceRef ? { ref: practiceRef, kind: 'practice' } : null
}

/** Each topic's first day in the plan (days come in date order). */
export function firstDayByTopic(days: StudyPlanDay[]): Map<string, string> {
  const first = new Map<string, string>()
  for (const day of days) {
    for (const topicId of day.userTopicIds ?? day.topicIds) {
      if (!first.has(topicId)) first.set(topicId, day.dayId)
    }
  }
  return first
}

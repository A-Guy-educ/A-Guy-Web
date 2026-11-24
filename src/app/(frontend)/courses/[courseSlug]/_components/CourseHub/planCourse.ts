/**
 * The course as the exam hub's prep plan sees it: the lessons its topics can
 * be matched to, with what a plan link needs.
 *
 * @fileType utility
 * @domain frontend
 */
import type { PlanCourse } from '@/app/(frontend)/study-plan/_components/planLessons'
import type { Course } from '@/infra/types/content'
import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'

export function toPlanCourse(
  course: Course,
  courseSlug: string,
  nodes: LessonSearchNode[],
): PlanCourse {
  return {
    id: course.id,
    slug: courseSlug,
    title: course.title,
    lessons: nodes.flatMap((node) =>
      node.chapterSlug && node.lesson.slug && node.lesson.title
        ? [
            {
              id: node.lesson.id,
              title: node.lesson.title,
              slug: node.lesson.slug,
              chapterSlug: node.chapterSlug,
              chapterTitle: node.chapterTitle,
              type: node.lessonType,
            },
          ]
        : [],
    ),
  }
}

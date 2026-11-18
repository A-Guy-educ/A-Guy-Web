import { getMeUser } from '@/infra/utils/getMeUser'
import { getHiddenLessonIdsForStudent } from '@/server/services/classroom/class-lesson-visibility'
import type { PrefetchedStudyData } from '@/server/repos/queries/study-page'

/**
 * Drops the lessons the student's class teachers hid. Runs per request on top of
 * `prefetchStudyData`, which is shared between users and must stay unfiltered.
 * A chapter left empty only because of hiding is dropped too.
 */
export async function withoutTeacherHiddenLessons(
  data: PrefetchedStudyData | null,
): Promise<PrefetchedStudyData | null> {
  if (!data) return data
  const { user } = await getMeUser()
  const hidden = await getHiddenLessonIdsForStudent(user, data.courseId)
  if (hidden.size === 0) return data

  return {
    ...data,
    chapters: data.chapters
      .map((chapter) => ({
        chapter,
        lessons: chapter.lessons.filter((lesson) => !hidden.has(lesson.id)),
      }))
      .filter(({ chapter, lessons }) => lessons.length > 0 || chapter.lessons.length === 0)
      .map(({ chapter, lessons }) => ({ ...chapter, lessons })),
  }
}

import { queryPublishedCourses } from '@/server/repos/queries/courses'

export async function getPublishedCourseList() {
  return queryPublishedCourses()
}

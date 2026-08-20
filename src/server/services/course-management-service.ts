import { queryManagedCourses, type ManagedCourseSummary } from '@/server/repos/queries/courses'

export async function listManagedCourses(): Promise<ManagedCourseSummary[]> {
  return queryManagedCourses()
}

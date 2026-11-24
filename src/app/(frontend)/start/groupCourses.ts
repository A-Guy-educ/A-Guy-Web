import type { Course } from '@/infra/types/content'

export interface CourseTrack {
  course: Course
  /** Button text: the part after the grade ("בסיס", "שאלון 372"), or the whole title. */
  title: string
}

export interface CourseGroup {
  /** Heading: the grade ("כיתה ח'"), or the whole title for a one-course subject. */
  label: string
  tracks: CourseTrack[]
}

const GRADE_TRACK_SEPARATOR = /\s+-\s+/

/**
 * Groups courses the way the demo's class picker shows them: one heading per
 * grade, one button per level. Course titles carry both ("כיתה ח' - בסיס"), so
 * the title is split at the first " - ". Groups keep the courses' order.
 */
export function groupCourses(courses: Course[]): CourseGroup[] {
  const groups: CourseGroup[] = []
  for (const course of courses) {
    const title = course.title.trim()
    const [grade, ...rest] = title.split(GRADE_TRACK_SEPARATOR)
    const label = rest.length > 0 ? grade : title
    const track = { course, title: rest.length > 0 ? rest.join(' - ') : title }
    const existing = groups.find((group) => group.label === label)
    if (existing) {
      existing.tracks.push(track)
    } else {
      groups.push({ label, tracks: [track] })
    }
  }
  return groups
}

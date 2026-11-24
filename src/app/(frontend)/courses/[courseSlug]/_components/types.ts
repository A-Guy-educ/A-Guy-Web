export interface LessonProgress {
  completed: number
  total: number
  percent: number
  /**
   * When the student last opened the lesson (its lesson progress record,
   * written as soon as the lesson page opens) — an opened, unfinished lesson
   * is what "continue" goes back to, even before anything in it is answered.
   */
  lastOpenedAt?: string
}

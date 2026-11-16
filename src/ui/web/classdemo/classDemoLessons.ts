// Sample lesson bank for the /classdemo walkthrough. Illustrative only — the
// demo never reads real courses, so nothing here is tied to lesson ids in the DB.

export type LessonType = 'study' | 'practice' | 'exam'

export type LessonFilter = 'all' | LessonType

export interface DemoLesson {
  id: string
  title: string
  type: LessonType
  subject: string
  minutes: number
  /** Students (out of CLASS_SIZE) who finished preparing this lesson. */
  ready: number
  description: string
}

export const CLASS_SIZE = 28

export const DEMO_LESSONS: readonly DemoLesson[] = [
  {
    id: 'l1',
    title: 'פונקציה קווית — שיפוע וגרף',
    type: 'study',
    subject: 'פונקציות',
    minutes: 15,
    ready: 21,
    description: 'נכיר שיפוע, נקודות וקריאת גרף של פונקציה קווית.',
  },
  {
    id: 'l2',
    title: 'משוואות עם נעלם אחד',
    type: 'practice',
    subject: 'אלגברה',
    minutes: 20,
    ready: 18,
    description: 'נתרגל פתרון משוואות בהדרגה ובאופן עצמאי.',
  },
  {
    id: 'l3',
    title: 'חפיפת משולשים — צ.ז.צ',
    type: 'study',
    subject: 'גאומטריה',
    minutes: 18,
    ready: 17,
    description: 'נלמד לזהות נתונים ולהסיק חפיפת משולשים.',
  },
  {
    id: 'l4',
    title: 'מקבילית — הגדרה ותכונות',
    type: 'study',
    subject: 'גאומטריה',
    minutes: 15,
    ready: 0,
    description: 'היכרות עם מקבילית ותכונות הצלעות והזוויות.',
  },
  {
    id: 'l5',
    title: 'משוואות עם מכנים',
    type: 'practice',
    subject: 'אלגברה',
    minutes: 22,
    ready: 0,
    description: 'נפתור משוואות הכוללות שברים ומכנים.',
  },
  {
    id: 'l6',
    title: 'פונקציות — בחינת סימולציה',
    type: 'exam',
    subject: 'פונקציות',
    minutes: 30,
    ready: 0,
    description: 'מבחן קצר לבדיקת השליטה בחומר.',
  },
  {
    id: 'l7',
    title: 'חוקי חזקות — חזרה',
    type: 'practice',
    subject: 'אלגברה',
    minutes: 12,
    ready: 24,
    description: 'רענון חוקי החזקות לקראת המשך הלמידה.',
  },
]

export const INITIAL_PUBLISHED: readonly string[] = ['l1', 'l2', 'l3', 'l7']

export const INITIAL_DONE: readonly string[] = ['l7']

export const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  study: 'שיעור לימוד',
  practice: 'שיעור תרגול',
  exam: 'בחינה',
}

export const LESSON_FILTERS: readonly { value: LessonFilter; label: string }[] = [
  { value: 'all', label: 'כל השיעורים' },
  { value: 'study', label: 'לימוד' },
  { value: 'practice', label: 'תרגול' },
  { value: 'exam', label: 'בחינות' },
]

/** Published lessons in lesson-bank order, regardless of the order they were opened. */
export const publishedLessons = (published: readonly string[]) =>
  DEMO_LESSONS.filter((lesson) => published.includes(lesson.id))

export const readyPercent = (lesson: DemoLesson) => Math.round((lesson.ready / CLASS_SIZE) * 100)

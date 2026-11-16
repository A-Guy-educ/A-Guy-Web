import { BookOpen, ClipboardCheck, PencilLine } from 'lucide-react'

import type { LessonType } from './classDemoLessons'

const STYLE: Record<LessonType, string> = {
  study: 'bg-nc-teacher-tint text-nc-teacher',
  practice: 'bg-nc-student-tint text-nc-student-deep',
  exam: 'bg-nc-mock-cream text-nc-grade-mid',
}

const ICON = { study: BookOpen, practice: PencilLine, exam: ClipboardCheck } as const

export function LessonTypeIcon({ type }: { type: LessonType }) {
  const Icon = ICON[type]
  return (
    <span
      className={`grid size-10 flex-none place-items-center rounded-[13px] sm:size-11 ${STYLE[type]}`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}

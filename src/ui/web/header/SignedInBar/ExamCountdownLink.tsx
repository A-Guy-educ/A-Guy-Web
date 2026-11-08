'use client'

import { CalendarDays } from 'lucide-react'

import { useExamCountdown } from '@/client/hooks/useExamCountdown'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useTranslations } from '@/ui/web/providers/I18n'

// Exams added from the study-plan page are saved under this key instead of a course id.
const STUDY_PLAN_EXAM_KEY = 'default-course'

export function getExamCountdownLabel(
  daysUntil: number | null,
  t: (key: string) => string,
): string {
  if (daysUntil === null) return t('setExam')
  if (daysUntil === 0) return t('examToday')
  if (daysUntil === 1) return t('examTomorrow')
  return t('examInDays').replace('{days}', String(daysUntil))
}

export function ExamCountdownLink({ courseId }: { courseId?: string }) {
  const t = useTranslations('common.header')
  const courseExam = useExamCountdown(courseId ?? STUDY_PLAN_EXAM_KEY)
  const studyPlanExam = useExamCountdown(STUDY_PLAN_EXAM_KEY)
  const { daysUntil } = courseExam.hasUpcomingExam ? courseExam : studyPlanExam

  return (
    <SystemLink
      href="/study-plan"
      className="flex items-center gap-content-gap-xs justify-self-center rounded-xl px-2 py-1 transition-colors duration-normal hover:bg-muted/50 md:px-3"
    >
      <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground sm:grid">
        <CalendarDays className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex flex-col whitespace-nowrap leading-tight">
        <span className="hidden text-body-xs text-muted-foreground md:block">{t('nextExam')}</span>
        <span className="text-body-xs font-bold md:text-body-sm">
          {getExamCountdownLabel(daysUntil, t)}
        </span>
      </span>
    </SystemLink>
  )
}

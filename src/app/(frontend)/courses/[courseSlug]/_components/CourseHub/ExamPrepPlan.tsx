/**
 * The demo's "my prep plan" on the exam hub: a collapsed row that opens our
 * study plan (the same one as /study-plan — date, topics, generated days),
 * here with the course, so topics match its lessons. The row shows the
 * course's exam date once there is one. The plan only loads once the row is
 * first opened; signed-out students get a log-in link instead, since plans
 * are saved per student.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import { useState } from 'react'

import type { PlanCourse } from '@/app/(frontend)/study-plan/_components/planLessons'
import { StudyPlanPanel } from '@/app/(frontend)/study-plan/_components/StudyPlanPanel'
import { useExamCountdown } from '@/client/hooks/useExamCountdown'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useTranslations } from '@/ui/web/providers/I18n'

interface ExamPrepPlanProps {
  course: PlanCourse
  isSignedIn: boolean
  loginHref: string
}

/** "5.12", as the demo writes the exam date. */
function shortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(day)}.${Number(month)}`
}

export function ExamPrepPlan({ course, isSignedIn, loginHref }: ExamPrepPlanProps) {
  const t = useTranslations('coursePage.hub.finder')
  const [opened, setOpened] = useState(false)
  const { nearestExam } = useExamCountdown(course.id)

  return (
    <details
      className="exam-prep-plan"
      onToggle={(e) => {
        if (e.currentTarget.open) setOpened(true)
      }}
    >
      <summary>
        <span>
          <strong>{t('planTitle')}</strong>
          <small>
            {nearestExam
              ? t('planSubDate').replace('{date}', shortDate(nearestExam.date))
              : t('planSub')}
          </small>
        </span>
      </summary>
      <div className="exam-prep-plan-body">
        {!isSignedIn ? (
          <SystemLink href={loginHref} className="exam-prep-login">
            {t('planLogin')}
          </SystemLink>
        ) : opened ? (
          <StudyPlanPanel stacked course={course} />
        ) : null}
      </div>
    </details>
  )
}

/**
 * The demo's "my prep plan" on the exam hub: a collapsed row that opens our
 * study plan (the same one as /study-plan — date, topics, generated days).
 * The plan only loads once the row is first opened; signed-out students get
 * a log-in link instead, since plans are saved per student.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import { useState } from 'react'

import { StudyPlanPanel } from '@/app/(frontend)/study-plan/_components/StudyPlanPanel'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useTranslations } from '@/ui/web/providers/I18n'

interface ExamPrepPlanProps {
  isSignedIn: boolean
  loginHref: string
}

export function ExamPrepPlan({ isSignedIn, loginHref }: ExamPrepPlanProps) {
  const t = useTranslations('coursePage.hub.finder')
  const [opened, setOpened] = useState(false)

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
          <small>{t('planSub')}</small>
        </span>
      </summary>
      <div className="exam-prep-plan-body">
        {!isSignedIn ? (
          <SystemLink href={loginHref} className="exam-prep-login">
            {t('planLogin')}
          </SystemLink>
        ) : opened ? (
          <StudyPlanPanel stacked />
        ) : null}
      </div>
    </details>
  )
}

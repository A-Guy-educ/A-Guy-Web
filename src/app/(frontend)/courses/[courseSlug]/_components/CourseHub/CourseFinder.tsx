/**
 * What a starting point opens, as in the demo. Learning, practice and exams
 * become a referral: the teacher asks what the student is after, and a photo
 * or a few words get them matching lessons (the composer below does the
 * matching; the chapters below are there to pick from directly). Exams open
 * the demo's exam hub with "my prep plan" (our study plan). Homework asks for
 * the exercise itself, which the composer hands to Ask.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import type { PlanCourse } from '@/app/(frontend)/study-plan/_components/planLessons'
import type { TeacherPersona } from '@/ui/web/privateLesson/teacherPersonas'
import { useTranslations } from '@/ui/web/providers/I18n'

import type { CourseHubAction } from './CourseWelcome'
import { ExamPrepPlan } from './ExamPrepPlan'

interface CourseFinderProps {
  kind: CourseHubAction
  persona: TeacherPersona
  /** The course, for the exam hub's prep plan to match topics to its lessons. */
  planCourse: PlanCourse
  isSignedIn: boolean
  loginHref: string
  onBack: () => void
  onCamera: () => void
  onUpload: () => void
}

export function CourseFinder({
  kind,
  persona,
  planCourse,
  isSignedIn,
  loginHref,
  onBack,
  onCamera,
  onUpload,
}: CourseFinderProps) {
  const t = useTranslations('coursePage.hub.finder')

  return (
    <section className="finder" aria-labelledby="finder-title">
      <button type="button" className="back-button" onClick={onBack}>
        <svg viewBox="0 0 24 24" className="pl-icon" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        {t('back')}
      </button>

      {kind === 'exams' ? (
        <div className="exam-hub">
          <h2 id="finder-title">{t('examHubTitle')}</h2>
          <p className="finder-sub">{t('examHubSub')}</p>
          <ExamPrepPlan course={planCourse} isSignedIn={isSignedIn} loginHref={loginHref} />
        </div>
      ) : kind === 'homework' ? (
        <div className="homework-picker">
          <h2 id="finder-title">{t('homeworkTitle')}</h2>
          <p>{t('homeworkSub')}</p>
          <UploadActions t={t} onCamera={onCamera} onUpload={onUpload} />
          <p className="homework-hint">{t('homeworkHint')}</p>
        </div>
      ) : (
        <>
          <div className="finder-teacher-question">
            <span className="pl-avatar" data-teacher={persona} aria-hidden="true" />
            <h2 id="finder-title">{t('topicTitle')}</h2>
          </div>
          <div className="finder-instruction">
            <strong>{t('topicInstruction')}</strong>
            <span>{t('topicHint')}</span>
          </div>
          <UploadActions t={t} onCamera={onCamera} onUpload={onUpload} />
        </>
      )}
    </section>
  )
}

function UploadActions({
  t,
  onCamera,
  onUpload,
}: {
  t: (key: string) => string
  onCamera: () => void
  onUpload: () => void
}) {
  return (
    <div className="upload-actions">
      <button type="button" className="upload-button" onClick={onCamera}>
        <svg viewBox="0 0 24 24" className="pl-icon" aria-hidden="true">
          <path d="m8 5 2-3h4l2 3h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        <span>{t('camera')}</span>
      </button>
      <button type="button" className="upload-button" onClick={onUpload}>
        <svg viewBox="0 0 24 24" className="pl-icon" aria-hidden="true">
          <path d="M14 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9zM14 2v7h7M12 18v-6M9 15l3-3 3 3" />
        </svg>
        <span>{t('upload')}</span>
      </button>
    </div>
  )
}

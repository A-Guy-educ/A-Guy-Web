/**
 * What a starting point opens, as in the demo. Learning, practice and exams
 * become a referral: the teacher asks what the student is after, and a photo
 * or a few words get them matching lessons (the composer below does the
 * matching; the chapters below are there to pick from directly). Homework
 * asks for the exercise itself, which the composer hands to Ask.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import type { TeacherPersona } from '@/ui/web/privateLesson/teacherPersonas'
import { useTranslations } from '@/ui/web/providers/I18n'

import type { CourseHubAction } from './CourseWelcome'

interface CourseFinderProps {
  kind: CourseHubAction
  persona: TeacherPersona
  onBack: () => void
  onCamera: () => void
  onUpload: () => void
}

export function CourseFinder({ kind, persona, onBack, onCamera, onUpload }: CourseFinderProps) {
  const t = useTranslations('coursePage.hub.finder')

  return (
    <section className="finder" aria-labelledby="finder-title">
      <button type="button" className="back-button" onClick={onBack}>
        {t('back')}
      </button>

      {kind === 'homework' ? (
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
            <h2 id="finder-title">{t(kind === 'exams' ? 'examTitle' : 'topicTitle')}</h2>
          </div>
          {kind === 'exams' ? (
            <p className="finder-sub">{t('examSub')}</p>
          ) : (
            <div className="finder-instruction">
              <strong>{t('topicInstruction')}</strong>
              <span>{t('topicHint')}</span>
            </div>
          )}
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

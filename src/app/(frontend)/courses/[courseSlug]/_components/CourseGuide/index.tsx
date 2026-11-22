/**
 * "מה עושים היום?" — the guide above the course tabs for a student who
 * doesn't know where to start: their teacher, a link back to the lesson they
 * were on, and four starting points (homework, learn from scratch, practice,
 * exam prep). The composer renders inside it, so the starting points hand
 * off to the same AI suggestions. Hidden on request, remembered per student.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import {
  BookOpen,
  ClipboardCheck,
  EyeOff,
  NotebookPen,
  Pencil,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import {
  readCourseGuideHidden,
  writeCourseGuideHidden,
} from '@/client/state/localStorage/courseGuide'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { isPersonaSlug, personaForSlug } from '@/ui/web/privateLesson/teacherPersonas'
import { TutorPortrait } from '@/ui/web/privateLesson/TutorPortrait'
import { useTranslations } from '@/ui/web/providers/I18n'
import { buildLessonHref } from '../CourseComposer/courseComposerLinks'
import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'

export type CourseGuideAction = 'homework' | 'learn' | 'practice' | 'exams'

const ACTIONS: Array<{ action: CourseGuideAction; icon: LucideIcon; labelKey: string }> = [
  { action: 'homework', icon: NotebookPen, labelKey: 'actions.homework' },
  { action: 'learn', icon: BookOpen, labelKey: 'actions.learn' },
  { action: 'practice', icon: Pencil, labelKey: 'actions.practice' },
  { action: 'exams', icon: ClipboardCheck, labelKey: 'actions.exams' },
]

interface CourseGuideProps {
  courseSlug: string
  teacherLabel: string | null
  /** The student's teacher profile; picks the portrait (guests get the demo's default). */
  teacherSlug: string | null
  continueLesson: LessonSearchNode | null
  onAction: (action: CourseGuideAction) => void
  /** The composer: shown under the guide, and on its own when the guide is hidden. */
  children: ReactNode
}

export function CourseGuide({
  courseSlug,
  teacherLabel,
  teacherSlug,
  continueLesson,
  onAction,
  children,
}: CourseGuideProps) {
  const t = useTranslations('coursePage.guide')
  const tp = useTranslations('teacherPersonas')
  const persona = personaForSlug(teacherSlug)
  // The demo's three teachers go by the demo's names; any other profile by its own label.
  const teacherName =
    isPersonaSlug(teacherSlug) || !teacherLabel ? tp(`${persona}.name`) : teacherLabel
  // null until mounted: reading storage during render would break hydration,
  // and showing the guide first would flash it for students who hid it.
  const [hidden, setHidden] = useState<boolean | null>(null)
  useEffect(() => setHidden(readCourseGuideHidden()), [])

  const setGuideHidden = (value: boolean) => {
    writeCourseGuideHidden(value)
    setHidden(value)
  }

  const continueHref = continueLesson ? buildLessonHref(continueLesson, courseSlug) : null

  if (hidden !== false) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        {hidden && (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              onClick={() => setGuideHidden(false)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-body-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              {t('show')}
            </button>
          </div>
        )}
        {children}
      </div>
    )
  }

  return (
    <section className="relative w-full max-w-3xl mx-auto" aria-labelledby="course-guide-title">
      <button
        type="button"
        onClick={() => setGuideHidden(true)}
        className="absolute top-0 end-0 inline-flex items-center gap-1 rounded-full px-2 py-1 text-body-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <EyeOff className="w-3.5 h-3.5" />
        {t('hide')}
      </button>

      <div className="flex flex-col items-center text-center">
        <TutorPortrait
          persona={persona}
          label={tp('portraitLabel').replace('{name}', teacherName)}
          winkTitle={tp('wink')}
        />
        <span className="mt-1 text-body-sm text-muted-foreground">{teacherName}</span>
        <h2
          id="course-guide-title"
          className="mt-4 text-heading-xl md:text-display-sm font-black text-foreground"
        >
          {t('greeting')}
        </h2>
        {continueLesson && continueHref && (
          <p className="mt-2 text-body-md text-muted-foreground">
            {t('continue')}{' '}
            <SystemLink
              href={continueHref}
              className="text-primary font-medium underline underline-offset-4 hover:opacity-80"
            >
              {continueLesson.lesson.title}
            </SystemLink>
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-content-gap-sm">
        {ACTIONS.map(({ action, icon: Icon, labelKey }) => (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            className="flex items-center gap-content-gap-sm rounded-2xl border border-primary/30 bg-card px-4 py-section-xs text-start text-body-md font-medium text-foreground hover:bg-primary/5 hover:border-primary/60 transition-colors"
          >
            <span className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
            </span>
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  )
}

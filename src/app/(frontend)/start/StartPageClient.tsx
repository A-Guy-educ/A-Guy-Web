'use client'

/**
 * /start — the demo's "נעים להכיר" card: pick a teacher, then a class and
 * level, then sign in (guests) or go straight to the course. A teacher picked
 * on the landing page (`?teacher=<slug>`) opens the card on the class step.
 *
 * @fileType component
 * @domain frontend
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { selectCourse, setUserProfile } from '@/client/state/localStorage/userProfile'
import { trackOnboardingStep } from '@/client/utils/guest-session-beacon'
import type { Course } from '@/infra/types/content'
import { OnboardingCompleteLoginModal } from '@/ui/web/auth/OnboardingCompleteLoginModal'
import {
  isPersonaSlug,
  PERSONA_PROFILE_SLUG,
  personaForSlug,
  TEACHER_PERSONAS,
} from '@/ui/web/privateLesson/teacherPersonas'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'

import { groupCourses } from './groupCourses'

import '@/ui/web/privateLesson/private-lesson.css'

type Direction = 'ltr' | 'rtl'
type Step = 'teacher' | 'course' | 'redirecting'

interface TeacherProfile {
  slug: string
  label: string
  description: string
}

interface StartPageClientProps {
  courses: Course[]
  direction: Direction
  isNewUser: boolean
  /** Teacher already picked on the landing page (`/start?teacher=<slug>`). */
  initialTeacherSlug?: string
}

const START_COPY = {
  he: {
    progress: 'נעים להכיר · {step} מתוך 2',
    teacherQuestion: 'איזה מורה תרצו?',
    courseQuestion: 'באיזו כיתה וברמה לומדים?',
    courseListLabel: 'מסלולי הלימוד',
    continue: 'ממשיכים',
    back: 'חזרה',
    footnote: 'אפשר לשנות את הבחירות בהמשך.',
    noTeachers: 'המורים יעלו בעוד רגע. אפשר גם להמשיך ישר לבחירת הכיתה.',
    skipTeacher: 'ממשיכים לבחירת הכיתה',
    noCourses: 'אין כרגע קורסים זמינים בשפה שנבחרה.',
    openingCourse: 'פותחים את הקורס…',
  },
  en: {
    progress: 'Nice to meet you · {step} of 2',
    teacherQuestion: 'Which teacher would you like?',
    courseQuestion: 'Which class and level are you in?',
    courseListLabel: 'Study tracks',
    continue: 'Continue',
    back: 'Back',
    footnote: 'You can change these choices later.',
    noTeachers: 'Teachers will load in a moment. You can also go straight to choosing a class.',
    skipTeacher: 'Continue to choosing a class',
    noCourses: 'No courses are available in the selected language yet.',
    openingCourse: 'Opening the course…',
  },
} as const

type StartCopy = (typeof START_COPY)['he'] | (typeof START_COPY)['en']

export function StartPageClient({ courses, direction, initialTeacherSlug }: StartPageClientProps) {
  const locale = useLocale()
  const copy = locale === 'he' ? START_COPY.he : START_COPY.en
  const tp = useTranslations('teacherPersonas')
  const [step, setStep] = useState<Step>('teacher')
  const [teacherProfiles, setTeacherProfiles] = useState<TeacherProfile[]>([])
  const [teacherSlug, setTeacherSlug] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [teacherFromLanding, setTeacherFromLanding] = useState(false)
  const { user, isLoading: isAuthLoading } = useCurrentUser()
  const isAnonymous = !user && !isAuthLoading

  // Guest funnel: the card is the persona → grade → sign-up onboarding.
  // Signed-in users run it too (course re-pick), so only anonymous visits count.
  useEffect(() => {
    if (isAnonymous) trackOnboardingStep('started')
  }, [isAnonymous])

  // A teacher picked on the landing page still counts as the persona step.
  // Tracked here rather than where it is applied, because auth may still be
  // loading when the profiles arrive.
  useEffect(() => {
    if (isAnonymous && teacherFromLanding) trackOnboardingStep('personaSelected')
  }, [isAnonymous, teacherFromLanding])

  useEffect(() => {
    document.body.classList.add('landing-page')
    return () => document.body.classList.remove('landing-page')
  }, [])

  const saveTeacherProfile = useCallback(async (slug: string) => {
    try {
      const res = await fetch('/api/user-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherProfileSlug: slug }),
      })
      if (!res.ok) {
        // Fallback to localStorage for guest users
        setUserProfile({ teacherProfileSlug: slug })
      }
    } catch {
      // network error, try localStorage fallback
      setUserProfile({ teacherProfileSlug: slug })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      let profiles: TeacherProfile[] = []
      try {
        const res = await fetch('/api/teacher-profiles')
        if (res.ok) profiles = ((await res.json()).profiles as TeacherProfile[]) ?? []
      } catch {
        // profiles stay empty; the card offers to skip to the class step
      }
      if (cancelled) return
      setTeacherProfiles(profiles)

      // Came from the landing page's teacher picker: keep that choice and go
      // straight to the class. An unknown slug falls back to asking.
      if (profiles.some((p) => p.slug === initialTeacherSlug) && initialTeacherSlug) {
        setTeacherSlug(initialTeacherSlug)
        setTeacherFromLanding(true)
        void saveTeacherProfile(initialTeacherSlug)
        setStep('course')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [initialTeacherSlug, saveTeacherProfile])

  const selectTeacher = (slug: string) => {
    setTeacherSlug(slug)
    if (isAnonymous) trackOnboardingStep('personaSelected')
    void saveTeacherProfile(slug)
    setStep('course')
  }

  const finish = () => {
    const course = selectedCourse
    if (!course) return
    selectCourse({
      gradeLevel: course.courseLabel || course.title,
      courseId: course.id,
      source: 'start-page',
    })
    // Signal to the OAuth callback that the wizard already collected
    // teacher / course — the persona onboarding wrap is redundant.
    // Server-side readers (the Google OAuth callback) use this cookie to
    // land the new user directly on their selected course instead of
    // bouncing them through `/onboarding/persona`, which on mobile can
    // appear as a second login popup (issue #783).
    document.cookie = `start_wizard_completed=1; path=/; max-age=600; SameSite=Lax`
    setStep('redirecting')

    if (isAnonymous) {
      trackOnboardingStep('gradeSelected')
      trackOnboardingStep('signupPromptShown')
      setShowLoginModal(true)
      return
    }
    window.location.assign(getCourseHref(course))
  }

  return (
    <main dir={direction} className="pl-onboarding-page">
      {step === 'teacher' && (
        <TeacherStep
          copy={copy}
          tp={tp}
          profiles={teacherProfiles}
          selectedSlug={teacherSlug}
          onSelect={selectTeacher}
          onSkip={() => setStep('course')}
        />
      )}
      {step === 'course' && (
        <CourseStep
          copy={copy}
          courses={courses}
          selected={selectedCourse}
          onSelect={setSelectedCourse}
          onContinue={finish}
          onBack={() => setStep('teacher')}
        />
      )}
      {step === 'redirecting' && (
        <div className="pl-onboarding" role="status">
          <h2>{copy.openingCourse}</h2>
        </div>
      )}

      <OnboardingCompleteLoginModal
        isOpen={showLoginModal}
        returnTo={selectedCourse ? getCourseHref(selectedCourse) : '/courses'}
      />
    </main>
  )
}

function Progress({ copy, step }: { copy: StartCopy; step: 1 | 2 }) {
  return <div className="onboarding-progress">{copy.progress.replace('{step}', String(step))}</div>
}

function TeacherStep({
  copy,
  tp,
  profiles,
  selectedSlug,
  onSelect,
  onSkip,
}: {
  copy: StartCopy
  tp: (key: string) => string
  profiles: TeacherProfile[]
  selectedSlug: string | null
  onSelect: (slug: string) => void
  onSkip: () => void
}) {
  // The demo's three teachers first, in the demo's order; any other profile after.
  const options = useMemo(
    () =>
      profiles
        .map((profile, index) => ({ profile, persona: personaForSlug(profile.slug, index) }))
        .sort((a, b) => rank(a.profile.slug) - rank(b.profile.slug)),
    [profiles],
  )

  return (
    <section className="pl-onboarding" aria-labelledby="onboarding-title">
      <Progress copy={copy} step={1} />
      <h2 id="onboarding-title">{copy.teacherQuestion}</h2>
      {options.length === 0 ? (
        <>
          <p className="teachers-empty">{copy.noTeachers}</p>
          <button type="button" className="text-button" onClick={onSkip}>
            {copy.skipTeacher}
          </button>
        </>
      ) : (
        <div className="teacher-options">
          {options.map(({ profile, persona }) => {
            const known = isPersonaSlug(profile.slug)
            return (
              <button
                key={profile.slug}
                type="button"
                className="teacher-option"
                aria-pressed={selectedSlug === profile.slug}
                onClick={() => onSelect(profile.slug)}
              >
                <span className="pl-avatar" data-teacher={persona} aria-hidden="true" />
                <div className="teacher-copy">
                  <strong>{known ? tp(`${persona}.name`) : profile.label}</strong>
                  <span>{known ? tp(`${persona}.tagline`) : profile.description}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
      <p className="onboarding-footnote">{copy.footnote}</p>
    </section>
  )
}

function CourseStep({
  copy,
  courses,
  selected,
  onSelect,
  onContinue,
  onBack,
}: {
  copy: StartCopy
  courses: Course[]
  selected: Course | null
  onSelect: (course: Course) => void
  onContinue: () => void
  onBack: () => void
}) {
  const groups = useMemo(() => groupCourses(courses), [courses])

  return (
    <section className="pl-onboarding choosing-course" aria-labelledby="onboarding-title">
      <Progress copy={copy} step={2} />
      <h2 id="onboarding-title">{copy.courseQuestion}</h2>
      <div className="course-picker-body">
        {groups.length === 0 ? (
          <p className="teachers-empty">{copy.noCourses}</p>
        ) : (
          <div className="course-choice-list" aria-label={copy.courseListLabel}>
            {groups.map((group) => (
              <section key={group.label} className="course-choice-group">
                <h3>{group.label}</h3>
                <div
                  className="course-track-options"
                  role="group"
                  aria-label={group.label}
                  style={{ '--tracks': group.tracks.length } as CSSProperties}
                >
                  {group.tracks.map(({ course, title }) => (
                    <button
                      key={course.id}
                      type="button"
                      className="course-track"
                      aria-pressed={selected?.id === course.id}
                      aria-label={group.tracks.length > 1 ? `${group.label} · ${title}` : title}
                      onClick={() => onSelect(course)}
                    >
                      <strong>{title}</strong>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <div className="course-picker-actions">
        <button type="button" className="primary-pill" disabled={!selected} onClick={onContinue}>
          {copy.continue}
        </button>
        <button type="button" className="text-button" onClick={onBack}>
          {copy.back}
        </button>
      </div>
    </section>
  )
}

const PERSONA_ORDER = TEACHER_PERSONAS.map((persona) => PERSONA_PROFILE_SLUG[persona])

function rank(slug: string): number {
  const index = PERSONA_ORDER.indexOf(slug)
  return index === -1 ? PERSONA_ORDER.length : index
}

function getCourseHref(course: Course) {
  return course.slug ? `/courses/${course.slug}` : '/study'
}

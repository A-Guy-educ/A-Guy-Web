'use client'

import { BookOpen, Bot, Crosshair, GraduationCap, Sparkles, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { selectCourse, setUserProfile } from '@/client/state/localStorage/userProfile'
import type { Course } from '@/infra/types/content'
import { cn } from '@/infra/utils/ui'
import { OnboardingCompleteLoginModal } from '@/ui/web/auth/OnboardingCompleteLoginModal'
import { LanguageSwitcher } from '@/ui/web/LanguageSwitcher'
import { useLocale } from '@/ui/web/providers/I18n'
import { ThemeSelector } from '@/ui/web/providers/Theme/ThemeSelector'

type Direction = 'ltr' | 'rtl'
type Pane = 'welcome' | 'conversation' | 'redirecting'
type Interaction = 'none' | 'teacher' | 'mood' | 'courses'
type Mood = 'excellent' | 'good' | 'tired'

interface TeacherProfile {
  slug: string
  label: string
  description: string
}

interface StartPageClientProps {
  courses: Course[]
  direction: Direction
  isNewUser: boolean
}

const START_COPY = {
  he: {
    badge: 'מערכת הלמידה האישית למתמטיקה',
    headline: 'ללמוד מתמטיקה בדרך החכמה',
    subtitle:
      'שיעורים אינטראקטיביים, תרגול מונחה, תשובות מיידיות לפענוח שאלות שלך, הכוונה למבחנים - הכל במקום אחד.',
    start: 'להתחיל ללמוד',
    intro: 'נעים מאוד! אני Aguy, מורה פרטי למתמטיקה',
    teacherQuestion: 'בחר את המורה שלך:',
    teacherSelected: 'בחרת את {teacher}',
    moodQuestion: 'איך את/ה היום?',
    courseQuestion: 'איזה כיתה/שאלון את/ה לומד/ת?',
    selected: 'בואו נתחיל!',
    noCourses: 'אין כרגע קורסים זמינים בשפה שנבחרה.',
    noTeacherProfiles: 'אין מורים זמינים כרגע.',
    courseFallback: 'קורס',
    openingCourse: 'פותח את הקורס...',
    redirecting: 'מעביר אותך אל',
    fallbackCourse: 'הקורס שבחרת',
    footer: 'Aguy Onboarding Platform © 2026. כל הזכויות שמורות.',
    moods: {
      excellent: {
        emoji: '🔥',
        title: 'אש, הולך טוב, רק צריך לתרגל',
      },
      good: {
        emoji: '👍',
        title: 'סבבה, אבל יש דברים שצריך לחדד',
      },
      tired: {
        emoji: '💪',
        title: 'הולך קשה, חייב ללמוד מאפס חלק מהדברים',
      },
    },
    teacherBadges: {
      detailed: 'בקטע טוב',
      focused: 'רק מה שצריך',
      recommended: 'ההמלצה שלנו',
    },
  },
  en: {
    badge: 'Personal math learning system',
    headline: 'Learn math the smart way',
    subtitle:
      'Interactive lessons, guided practice, instant help with questions, and exam preparation in one place.',
    start: 'Start learning',
    intro: 'Nice to meet you. I am Aguy, your private math tutor.',
    teacherQuestion: 'Choose your teacher:',
    teacherSelected: 'You selected {teacher}',
    moodQuestion: 'How are you feeling today?',
    courseQuestion: 'Which grade or exam are you studying for?',
    selected: "Let's begin!",
    noCourses: 'No courses are available in the selected language yet.',
    noTeacherProfiles: 'No teachers are available right now.',
    courseFallback: 'Course',
    openingCourse: 'Opening the course...',
    redirecting: 'Taking you to',
    fallbackCourse: 'your selected course',
    footer: 'Aguy Onboarding Platform © 2026. All rights reserved.',
    moods: {
      excellent: {
        emoji: '🔥',
        title: "On fire — I'm doing well, just need to practice",
      },
      good: {
        emoji: '👍',
        title: 'Alright, but there are things I need to sharpen',
      },
      tired: {
        emoji: '💪',
        title: 'Struggling — I need to learn some things from scratch',
      },
    },
    teacherBadges: {
      detailed: 'Deep dive',
      focused: 'Just the essentials',
      recommended: 'Our recommendation',
    },
  },
} as const

const moodOrder: Mood[] = ['excellent', 'good', 'tired']

export function StartPageClient({ courses, direction }: StartPageClientProps) {
  const locale = useLocale()
  const copy = locale === 'he' ? START_COPY.he : START_COPY.en
  const [pane, setPane] = useState<Pane>('conversation')
  const [interaction, setInteraction] = useState<Interaction>('none')
  const [displayedText, setDisplayedText] = useState('')
  const [audioEnabled] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [teacherProfiles, setTeacherProfiles] = useState<TeacherProfile[]>([])
  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState<TeacherProfile | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { user, isLoading: isAuthLoading } = useCurrentUser()

  useEffect(() => {
    document.body.classList.add('landing-page')
    return () => document.body.classList.remove('landing-page')
  }, [])

  const playTone = useCallback(
    (freq = 600, duration = 70) => {
      if (!audioEnabled) return

      try {
        const browserWindow = window as Window & {
          webkitAudioContext?: typeof AudioContext
        }
        const AudioContextCtor = window.AudioContext || browserWindow.webkitAudioContext
        if (!AudioContextCtor) return
        const audioContext = new AudioContextCtor()
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)
        gain.gain.setValueAtTime(0.025, audioContext.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration / 1000)
        oscillator.connect(gain)
        gain.connect(audioContext.destination)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + duration / 1000)
      } catch {
        // Audio is decorative only.
      }
    },
    [audioEnabled],
  )

  const showText = useCallback((text: string) => {
    setDisplayedText(text)
  }, [])

  const fetchTeacherProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/teacher-profiles')
      if (res.ok) {
        const data = await res.json()
        if (data.profiles) {
          setTeacherProfiles(data.profiles)
        }
      }
    } catch {
      // profiles remain empty, wizard will skip or show empty state
    }
  }, [])

  const startConversation = useCallback(async () => {
    setPane('conversation')
    setInteraction('none')
    await fetchTeacherProfiles()
    showText(copy.teacherQuestion)
    setInteraction('teacher')
  }, [copy.teacherQuestion, fetchTeacherProfiles, showText])

  useEffect(() => {
    if (pane === 'conversation') {
      startConversation()
    }
  }, [pane, startConversation])

  const selectMood = useCallback(
    (_mood: Mood) => {
      playTone(580, 120)
      showText(copy.courseQuestion)
      setInteraction('courses')
    },
    [copy.courseQuestion, playTone, showText],
  )

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

  const selectTeacher = useCallback(
    async (teacher: TeacherProfile) => {
      setSelectedTeacherProfile(teacher)
      playTone(580, 120)
      showText(copy.moodQuestion)
      setInteraction('mood')
      await saveTeacherProfile(teacher.slug)
    },
    [copy.moodQuestion, playTone, saveTeacherProfile, showText],
  )

  const selectCourseHandler = useCallback(
    async (course: Course) => {
      setSelectedCourse(course)
      selectCourse({
        gradeLevel: course.courseLabel || course.title,
        courseId: course.id,
        source: 'start-page',
      })
      // Signal to the OAuth callback that the wizard already collected
      // teacher / mood / course — the persona onboarding wrap is redundant.
      // Server-side readers (the Google OAuth callback) use this cookie to
      // land the new user directly on their selected course instead of
      // bouncing them through `/onboarding/persona`, which on mobile can
      // appear as a second login popup (issue #783).
      if (typeof document !== 'undefined') {
        document.cookie = `start_wizard_completed=1; path=/; max-age=600; SameSite=Lax`
      }
      setInteraction('none')
      playTone(580, 120)
      showText(copy.selected)

      const isAnonymous = !user && !isAuthLoading
      if (isAnonymous) {
        setPane('redirecting')
        setShowLoginModal(true)
        return
      }

      setPane('redirecting')
      window.setTimeout(() => {
        window.location.assign(getCourseHref(course))
      }, 800)
    },
    [copy.selected, isAuthLoading, playTone, showText, user],
  )

  return (
    <main
      dir={direction}
      className="min-h-screen overflow-hidden bg-background font-sans text-foreground"
    >
      <div className="pointer-events-none fixed -left-24 top-20 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-24 right-10 h-96 w-96 rounded-full bg-success/10 blur-[120px]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="fixed left-4 top-4 z-50 flex items-center gap-content-gap-xs rounded-xl border border-border bg-card/90 p-1 shadow-elevation-1 backdrop-blur">
          <LanguageSwitcher />
          <ThemeSelector />
        </div>

        <section className="flex flex-1 items-center justify-center px-4 py-section-xs">
          {pane === 'conversation' && (
            <ConversationPane
              copy={copy}
              courses={courses}
              displayedText={displayedText}
              interaction={interaction}
              selectedCourse={selectedCourse}
              teacherProfiles={teacherProfiles}
              selectedTeacherProfile={selectedTeacherProfile}
              onSelectCourse={selectCourseHandler}
              onSelectMood={selectMood}
              onSelectTeacher={selectTeacher}
            />
          )}
          {pane === 'redirecting' && (
            <RedirectingPane copy={copy} selectedCourse={selectedCourse} />
          )}
        </section>

        <StartFooter activeIndex={paneToIndex(pane)} copy={copy} />
      </div>

      <OnboardingCompleteLoginModal
        isOpen={showLoginModal}
        returnTo={selectedCourse ? getCourseHref(selectedCourse) : '/courses'}
      />
    </main>
  )
}

function ConversationPane({
  copy,
  courses,
  displayedText,
  interaction,
  selectedCourse,
  teacherProfiles,
  selectedTeacherProfile,
  onSelectMood,
  onSelectCourse,
  onSelectTeacher,
}: {
  copy: (typeof START_COPY)['he'] | (typeof START_COPY)['en']
  courses: Course[]
  displayedText: string
  interaction: Interaction
  selectedCourse: Course | null
  teacherProfiles: TeacherProfile[]
  selectedTeacherProfile: TeacherProfile | null
  onSelectMood: (mood: Mood) => void
  onSelectCourse: (course: Course) => void
  onSelectTeacher: (teacher: TeacherProfile) => void
}) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card text-primary shadow-elevation-1">
          <Bot className="h-10 w-10" aria-hidden />
        </div>

        <p className="min-h-24 max-w-3xl text-display-sm font-extrabold leading-relaxed text-foreground md:text-display-md">
          {displayedText}
        </p>
      </div>

      <div
        className={cn(
          'transition-all duration-normal',
          interaction === 'none' ? 'opacity-0' : 'opacity-100',
        )}
      >
        {interaction === 'teacher' ? (
          <TeacherGrid
            copy={copy}
            teacherProfiles={teacherProfiles}
            selectedTeacherProfile={selectedTeacherProfile}
            onSelectTeacher={onSelectTeacher}
          />
        ) : null}
        {interaction === 'mood' ? <MoodGrid copy={copy} onSelectMood={onSelectMood} /> : null}
        {interaction === 'courses' ? (
          <CourseGrid
            copy={copy}
            courses={courses}
            selectedCourse={selectedCourse}
            onSelectCourse={onSelectCourse}
          />
        ) : null}
      </div>
    </div>
  )
}

function MoodGrid({
  copy,
  onSelectMood,
}: {
  copy: (typeof START_COPY)['he'] | (typeof START_COPY)['en']
  onSelectMood: (mood: Mood) => void
}) {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-content-gap-sm md:grid-cols-3">
      {moodOrder.map((mood) => (
        <button
          key={mood}
          type="button"
          onClick={() => onSelectMood(mood)}
          className="flex flex-col items-center gap-content-gap-xs rounded-2xl border-2 border-transparent bg-card p-card-padding text-center shadow-elevation-1 transition-all duration-normal hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevation-2"
        >
          <span className="text-display-md leading-none">{copy.moods[mood].emoji}</span>
          <span className="text-heading-md font-bold leading-snug text-card-foreground">
            {copy.moods[mood].title}
          </span>
        </button>
      ))}
    </div>
  )
}

function CourseGrid({
  copy,
  courses,
  selectedCourse,
  onSelectCourse,
}: {
  copy: (typeof START_COPY)['he'] | (typeof START_COPY)['en']
  courses: Course[]
  selectedCourse: Course | null
  onSelectCourse: (course: Course) => void
}) {
  if (courses.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-content-gap rounded-2xl border border-border bg-card p-card-padding text-center text-body-md text-muted-foreground">
        <p>{copy.noCourses}</p>
        <LanguageSwitcher />
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
      {courses.map((course) => (
        <button
          key={course.id}
          type="button"
          onClick={() => onSelectCourse(course)}
          className={cn(
            'relative min-h-32 rounded-xl border border-border bg-card p-card-padding-sm text-start shadow-elevation-1 transition-transform duration-normal hover:-translate-y-0.5 hover:border-primary/50',
            selectedCourse?.id === course.id && 'border-primary',
          )}
        >
          <span className="absolute left-3 top-3 rounded border border-primary/10 bg-primary/10 px-2 py-1 text-body-xs font-extrabold text-primary">
            {course.courseLabel || copy.courseFallback}
          </span>
          <span className="mt-8 block text-heading-sm font-extrabold text-card-foreground">
            {course.title}
          </span>
          {course.description ? (
            <span className="mt-2 line-clamp-2 block text-body-xs text-muted-foreground">
              {stripHtml(course.description)}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

type TeacherVariant = 'detailed' | 'recommended' | 'focused' | 'default'

interface TeacherVisual {
  variant: TeacherVariant
  icon: LucideIcon
  iconWrapClass: string
}

const RECOMMENDED_KEYWORDS = ['guy', 'balanced', 'recommended', 'גיא']
const DETAILED_KEYWORDS = ['detail', 'deep', 'patient', 'סבלני', 'חופר', 'מעמיק']
const FOCUSED_KEYWORDS = ['focused', 'brief', 'short', 'ממוקד']

function matchesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n))
}

function resolveTeacherVisual(teacher: TeacherProfile): TeacherVisual {
  // Match on both slug and label so DBs that use opaque slugs but readable
  // Hebrew/English labels still get the intended visual.
  const haystack = `${teacher.slug} ${teacher.label}`.toLowerCase()

  if (matchesAny(haystack, RECOMMENDED_KEYWORDS)) {
    return {
      variant: 'recommended',
      icon: GraduationCap,
      iconWrapClass: 'bg-success/15 text-success',
    }
  }
  if (matchesAny(haystack, DETAILED_KEYWORDS)) {
    return { variant: 'detailed', icon: BookOpen, iconWrapClass: 'bg-primary/10 text-primary' }
  }
  if (matchesAny(haystack, FOCUSED_KEYWORDS)) {
    return {
      variant: 'focused',
      icon: Crosshair,
      iconWrapClass: 'bg-accent/40 text-accent-foreground',
    }
  }
  return { variant: 'default', icon: Sparkles, iconWrapClass: 'bg-muted text-muted-foreground' }
}

function TeacherGrid({
  copy,
  teacherProfiles,
  selectedTeacherProfile,
  onSelectTeacher,
}: {
  copy: (typeof START_COPY)['he'] | (typeof START_COPY)['en']
  teacherProfiles: TeacherProfile[]
  selectedTeacherProfile: TeacherProfile | null
  onSelectTeacher: (teacher: TeacherProfile) => void
}) {
  if (teacherProfiles.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-content-gap rounded-2xl border border-border bg-card p-card-padding text-center text-body-md text-muted-foreground">
        <p>{copy.noTeacherProfiles}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-content-gap md:grid-cols-3">
      {teacherProfiles.map((teacher) => {
        const visual = resolveTeacherVisual(teacher)
        const isSelected = selectedTeacherProfile?.slug === teacher.slug
        const isRecommended = visual.variant === 'recommended'
        const secondaryBadge =
          visual.variant === 'detailed'
            ? copy.teacherBadges.detailed
            : visual.variant === 'focused'
              ? copy.teacherBadges.focused
              : null

        const Icon = visual.icon

        return (
          <button
            key={teacher.slug}
            type="button"
            onClick={() => onSelectTeacher(teacher)}
            className={cn(
              'group relative flex flex-col items-center rounded-2xl border-2 bg-card p-card-padding text-center shadow-elevation-1 transition-all duration-normal hover:-translate-y-0.5 hover:shadow-elevation-2',
              isSelected
                ? 'border-primary bg-primary/5'
                : isRecommended
                  ? 'border-success/30 hover:border-success/60'
                  : 'border-transparent hover:border-primary/40',
            )}
          >
            {isRecommended ? (
              <span className="absolute -top-3 end-4 rotate-3 rounded-full bg-success px-3 py-1 text-body-xs font-bold text-success-foreground shadow-elevation-2">
                {copy.teacherBadges.recommended}
              </span>
            ) : null}

            <span
              className={cn(
                'mb-4 flex h-16 w-16 items-center justify-center rounded-full text-heading-xl',
                visual.iconWrapClass,
              )}
            >
              <Icon className="h-7 w-7" aria-hidden />
            </span>

            <span className="mb-2 text-heading-lg font-bold text-card-foreground">
              {teacher.label}
            </span>

            {secondaryBadge ? (
              <span className="mb-2 rounded-full bg-muted/60 px-2.5 py-0.5 text-body-xs font-semibold text-muted-foreground">
                {secondaryBadge}
              </span>
            ) : null}

            {teacher.description ? (
              <span className="text-body-sm leading-snug text-muted-foreground">
                {teacher.description}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function RedirectingPane({
  copy,
  selectedCourse,
}: {
  copy: (typeof START_COPY)['he'] | (typeof START_COPY)['en']
  selectedCourse: Course | null
}) {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-6 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <h2 className="mb-2 text-heading-xl font-extrabold text-foreground">{copy.openingCourse}</h2>
      <p className="text-body-sm text-muted-foreground">
        {copy.redirecting} {selectedCourse?.title || copy.fallbackCourse}...
      </p>
    </div>
  )
}

function StartFooter({
  activeIndex,
  copy,
}: {
  activeIndex: number
  copy: (typeof START_COPY)['he'] | (typeof START_COPY)['en']
}) {
  return (
    <div
      role="contentinfo"
      className="border-t border-border bg-card/70 py-5 text-center text-body-xs text-muted-foreground"
    >
      <div className="mb-3 flex justify-center gap-content-gap-xs">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              'h-1 rounded-full bg-muted-foreground/30 transition-all duration-normal',
              index === activeIndex ? 'w-4 bg-primary' : 'w-2',
            )}
          />
        ))}
      </div>
      {copy.footer}
    </div>
  )
}

function paneToIndex(pane: Pane) {
  if (pane === 'welcome') return 0
  if (pane === 'conversation') return 1
  return 2
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function getCourseHref(course: Course) {
  return course.slug ? `/courses/${course.slug}` : '/study'
}

/**
 * The demo's welcome: the teacher's portrait, "מה עושים היום?" (which gives
 * way to the teacher's line for a few seconds), a link back to the lesson the
 * student was on, and four starting points. The cards arrive one by one, then
 * every 8 seconds one leans forward until the student starts doing something.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { SystemLink } from '@/infra/loading/components/SystemLink'
import { isPersonaSlug, personaForSlug } from '@/ui/web/privateLesson/teacherPersonas'
import { TutorPortrait } from '@/ui/web/privateLesson/TutorPortrait'
import { useTranslations } from '@/ui/web/providers/I18n'

export type CourseHubAction = 'homework' | 'learn' | 'practice' | 'exams'

const QUOTE_AFTER_MS = 3200
const QUOTE_FOR_MS = 4800
const SPOTLIGHT_EVERY_MS = 8000
const SPOTLIGHT_CHECK_MS = 400
const PORTRAIT_HELLO_MS = 350

const ACTIONS: Array<{ action: CourseHubAction; icon: ReactNode }> = [
  {
    action: 'homework',
    icon: (
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7M9 8H7M11 13H7M10 18H7M14 10l1-4 4-4 3 3-4 4z" />
    ),
  },
  {
    action: 'learn',
    icon: <path d="M12 6c-3-3-7-3-10-2v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 2zM12 6v15" />,
  },
  {
    action: 'practice',
    icon: <path d="m14 5 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14zM4 14l5 5" />,
  },
  {
    action: 'exams',
    icon: (
      <>
        <rect x="5" y="4" width="14" height="18" rx="2" />
        <path d="M9 4V2h6v2M9 11l2 2 4-4M9 18h6" />
      </>
    ),
  },
]

interface CourseWelcomeProps {
  teacherSlug: string | null
  teacherLabel: string | null
  /** The teacher isn't known yet: the portrait and name wait rather than show the default one. */
  teacherPending?: boolean
  /** The lesson to go back to; a student who has one gets the returning greeting. */
  continueLesson: { title: string; href: string } | null
  examDaysUntil: number | null
  onAction: (action: CourseHubAction) => void
}

export function CourseWelcome({
  teacherSlug,
  teacherLabel,
  teacherPending = false,
  continueLesson,
  examDaysUntil,
  onAction,
}: CourseWelcomeProps) {
  const t = useTranslations('coursePage.hub')
  const tp = useTranslations('teacherPersonas')
  const persona = personaForSlug(teacherSlug)
  // The demo's three teachers go by the demo's names; any other profile by its own label.
  const teacherName =
    isPersonaSlug(teacherSlug) || !teacherLabel ? tp(`${persona}.name`) : teacherLabel
  const showQuote = useTeacherLine(persona)
  const { entryRef, entering, onEntryAnimationEnd } = useCardMotion()

  return (
    <section
      className={['welcome', continueLesson && 'returning', teacherPending && 'teacher-pending']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="welcome-inner">
        <TutorPortrait
          persona={persona}
          label={tp('portraitLabel').replace('{name}', teacherName)}
          winkTitle={tp('wink')}
          greetAfterMs={PORTRAIT_HELLO_MS}
        />
        <div className="teacher-name">{teacherName}</div>
        <h2 className={showQuote ? 'welcome-title show-teacher-line' : 'welcome-title'}>
          <span className="welcome-line welcome-line-greeting" aria-hidden={showQuote}>
            {continueLesson ? t('greetingReturning') : t('greeting')}
          </span>
          <span className="welcome-line welcome-line-quote" aria-hidden={!showQuote}>
            {tp(`${persona}.intro`)}
          </span>
        </h2>

        {continueLesson && (
          <div className="return-entry">
            <span className="continue-label">{t('continue')}</span>{' '}
            <SystemLink href={continueLesson.href} className="continue-last">
              {continueLesson.title}
            </SystemLink>
          </div>
        )}

        <div
          ref={entryRef}
          className={entering ? 'entry welcome-enter' : 'entry'}
          onAnimationEnd={onEntryAnimationEnd}
        >
          {ACTIONS.map(({ action, icon }) => (
            <button key={action} type="button" className="pill" onClick={() => onAction(action)}>
              <span className="entry-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="pl-icon">
                  {icon}
                </svg>
              </span>
              {action === 'exams' && examDaysUntil !== null ? (
                <span className="entry-copy">
                  <span>{t(`actions.${action}`)}</span>
                  <small className="exam-badge">
                    {t('examBadge').replace('{days}', String(examDaysUntil))}
                  </small>
                </span>
              ) : (
                <span>{t(`actions.${action}`)}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/** "מה עושים היום?" gives way to the teacher's line once, then comes back. */
function useTeacherLine(persona: string): boolean {
  const [showQuote, setShowQuote] = useState(false)
  useEffect(() => {
    setShowQuote(false)
    let hideTimer: number | undefined
    const showTimer = window.setTimeout(() => {
      if (document.hidden) return
      setShowQuote(true)
      hideTimer = window.setTimeout(() => setShowQuote(false), QUOTE_FOR_MS)
    }, QUOTE_AFTER_MS)
    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [persona])
  return showQuote
}

/**
 * The cards' entrance, then the lean-forward spotlight: one card every 8
 * seconds while the cards are on screen, until the student touches the cards,
 * the continue link or the composer.
 */
function useCardMotion() {
  const entryRef = useRef<HTMLDivElement>(null)
  const [entering, setEntering] = useState(false)

  useEffect(() => {
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!quiet) setEntering(true)
  }, [])

  useEffect(() => {
    let paused = false
    let index = 0
    let nextAt = Date.now() + SPOTLIGHT_EVERY_MS
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)')

    const pause = (event: Event) => {
      const target = event.target as Element | null
      if (target?.closest?.('.entry, .continue-last, .composer')) paused = true
    }
    const tick = () => {
      const entry = entryRef.current
      if (!entry || paused || quiet.matches || document.hidden) return
      if (entry.classList.contains('welcome-enter') || Date.now() < nextAt) return
      const rect = entry.getBoundingClientRect()
      if (rect.top < 64 || rect.bottom > window.innerHeight) return
      const cards = entry.querySelectorAll<HTMLElement>('.pill')
      if (cards.length === 0) return
      cards.forEach((card) => card.classList.remove('card-spotlight'))
      const card = cards[index % cards.length]
      index += 1
      nextAt = Date.now() + SPOTLIGHT_EVERY_MS
      card.classList.add('card-spotlight')
      card.addEventListener('animationend', () => card.classList.remove('card-spotlight'), {
        once: true,
      })
    }

    const timer = window.setInterval(tick, SPOTLIGHT_CHECK_MS)
    document.addEventListener('pointerdown', pause, true)
    document.addEventListener('input', pause, true)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('pointerdown', pause, true)
      document.removeEventListener('input', pause, true)
    }
  }, [])

  // The entrance ends when the last card has arrived.
  const onEntryAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target === entryRef.current?.lastElementChild) setEntering(false)
  }

  return { entryRef, entering, onEntryAnimationEnd }
}

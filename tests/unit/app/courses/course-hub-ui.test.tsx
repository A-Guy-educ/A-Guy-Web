// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDictation } from '@/app/(frontend)/courses/[courseSlug]/_components/CourseComposer/useDictation'
import { CourseFinder } from '@/app/(frontend)/courses/[courseSlug]/_components/CourseHub/CourseFinder'
import { CourseWelcome } from '@/app/(frontend)/courses/[courseSlug]/_components/CourseHub/CourseWelcome'
import { CourseTabs } from '@/app/(frontend)/courses/[courseSlug]/_components/CourseTabs'
import { ChapterAccordion } from '@/app/(frontend)/courses/[courseSlug]/_components/LessonListTab/ChapterAccordion'
import type { ChapterRoadmapGroup } from '@/app/(frontend)/courses/[courseSlug]/_components/LessonListTab/lessonRoadmapTypes'
import { I18nProvider } from '@/ui/web/providers/I18n'

import heMessages from '../../../../src/i18n/he.json'

vi.mock('@/infra/loading/components/SystemLink', () => ({
  SystemLink: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/app/(frontend)/study-plan/_components/StudyPlanPanel', () => ({
  StudyPlanPanel: ({ stacked }: { stacked?: boolean }) => (
    <div data-testid="study-plan" data-stacked={String(Boolean(stacked))} />
  ),
}))

const he = (ui: React.ReactNode) =>
  render(
    <I18nProvider locale="he" messages={heMessages}>
      {ui}
    </I18nProvider>,
  )

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('CourseWelcome', () => {
  // jsdom has no matchMedia; full motion, as in most browsers.
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
  })

  it('greets a new student and hands each starting point to the page', () => {
    const onAction = vi.fn()
    he(
      <CourseWelcome
        teacherSlug="teacher_focused"
        teacherLabel="מורה ממוקד"
        continueLesson={null}
        examDaysUntil={null}
        onAction={onAction}
      />,
    )
    expect(screen.getByText('מה עושים היום?')).toBeTruthy()
    expect(screen.getByText('הממוקדת')).toBeTruthy()
    expect(screen.queryByText('ממשיכים:')).toBeNull()
    expect(screen.queryByRole('button', { name: /הסתר/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'שיעורי בית' }))
    fireEvent.click(screen.getByRole('button', { name: 'להתכונן לבחינה' }))
    expect(onAction.mock.calls).toEqual([['homework'], ['exams']])
  })

  it('welcomes a returning student back to their lesson and shows the exam countdown', () => {
    he(
      <CourseWelcome
        teacherSlug={null}
        teacherLabel={null}
        continueLesson={{ title: 'ייצוג של קו ישר', href: '/courses/c/chapters/ch/lessons/l1' }}
        examDaysUntil={5}
        onAction={vi.fn()}
      />,
    )
    expect(screen.getByText('היי היי, מה עושים היום?')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'ייצוג של קו ישר' }).getAttribute('href')).toBe(
      '/courses/c/chapters/ch/lessons/l1',
    )
    expect(screen.getByText('הבחינה בעוד 5 ימים')).toBeTruthy()
  })

  it("gives way to the teacher's line after 3.2 seconds, then comes back", () => {
    vi.useFakeTimers()
    he(
      <CourseWelcome
        teacherSlug="teacher_patient"
        teacherLabel={null}
        continueLesson={null}
        examDaysUntil={null}
        onAction={vi.fn()}
      />,
    )
    const title = screen.getByRole('heading', { level: 2 })
    expect(title.className).not.toContain('show-teacher-line')
    act(() => {
      vi.advanceTimersByTime(3200)
    })
    expect(title.className).toContain('show-teacher-line')
    expect(screen.getByText('כדי להבין באמת, נרד לפרטים הקטנים.')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(4800)
    })
    expect(title.className).not.toContain('show-teacher-line')
  })
})

describe('CourseFinder', () => {
  const renderFinder = (kind: 'learn' | 'homework' | 'exams', isSignedIn = true) => {
    const handlers = { onBack: vi.fn(), onCamera: vi.fn(), onUpload: vi.fn() }
    he(
      <CourseFinder
        kind={kind}
        persona="detailed"
        isSignedIn={isSignedIn}
        loginHref="/login?returnTo=%2Fcourses%2Fc"
        {...handlers}
      />,
    )
    return handlers
  }

  it('asks for the topic, with camera and upload, for learning', () => {
    const handlers = renderFinder('learn')
    expect(screen.getByRole('heading', { name: 'איזה נושא?' })).toBeTruthy()
    expect(screen.getByText('צלמו תרגיל או כתבו את שם הנושא')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'צילום במצלמה' }))
    fireEvent.click(screen.getByRole('button', { name: 'העלאת מסמך' }))
    fireEvent.click(screen.getByRole('button', { name: 'חזרה' }))
    expect(handlers.onCamera).toHaveBeenCalled()
    expect(handlers.onUpload).toHaveBeenCalled()
    expect(handlers.onBack).toHaveBeenCalled()
  })

  it('opens the exam hub with the study plan inside "my prep plan"', () => {
    renderFinder('exams')
    expect(screen.getByRole('heading', { name: 'מתכוננים לבחינה' })).toBeTruthy()
    // The plan only loads once the row is opened.
    expect(screen.queryByTestId('study-plan')).toBeNull()
    const details = screen.getByText('תוכנית ההכנה שלי').closest('details')!
    details.open = true
    fireEvent(details, new Event('toggle'))
    expect(screen.getByTestId('study-plan').dataset.stacked).toBe('true')
  })

  it('asks a signed-out student to log in before building a plan', () => {
    renderFinder('exams', false)
    expect(
      screen.getByRole('link', { name: 'התחברו כדי לבנות תוכנית הכנה' }).getAttribute('href'),
    ).toBe('/login?returnTo=%2Fcourses%2Fc')
    expect(screen.queryByTestId('study-plan')).toBeNull()
  })

  it('asks for the homework exercise itself', () => {
    renderFinder('homework')
    expect(screen.getByRole('heading', { name: 'ניגשים לשיעורי הבית' })).toBeTruthy()
    expect(screen.getByText('אפשר גם להקליד את התרגיל בשורה למטה.')).toBeTruthy()
  })
})

describe('CourseTabs', () => {
  it('offers learning, practice and exams only', () => {
    const onTabChange = vi.fn()
    he(<CourseTabs activeTab="practice" onTabChange={onTabChange} />)
    const tabs = screen.getAllByRole('button')
    expect(tabs.map((b) => b.textContent)).toEqual(['למידה', 'תרגול', 'בחינות'])
    expect(tabs[1].getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(tabs[2])
    expect(onTabChange).toHaveBeenCalledWith('exams')
  })
})

describe('ChapterAccordion', () => {
  it("shows the demo's chapter line and done count", () => {
    const group = {
      chapter: { id: 'c1', title: 'פונקציה קווית', slug: 'c1' },
      chapterIndex: 0,
      completedCount: 1,
      totalCount: 2,
      hasFeatured: false,
      lessons: [],
    } as unknown as ChapterRoadmapGroup
    he(
      <AccordionPrimitive.Root type="multiple">
        <ChapterAccordion group={group} visibleLessons={[]} courseSlug="c" />
      </AccordionPrimitive.Root>,
    )
    expect(screen.getByText('פרק 1 · 2 שיעורים')).toBeTruthy()
    expect(screen.getByText('1/2 הושלמו')).toBeTruthy()
  })
})

describe('useDictation', () => {
  it('falls back to the unavailable message without speech recognition', () => {
    vi.stubGlobal('SpeechRecognition', undefined)
    vi.stubGlobal('webkitSpeechRecognition', undefined)
    const onUnavailable = vi.fn()
    const { result } = renderHook(() =>
      useDictation({ locale: 'he', onText: vi.fn(), onUnavailable, onFailed: vi.fn() }),
    )
    act(() => result.current.toggle())
    expect(onUnavailable).toHaveBeenCalled()
  })

  it('puts what was said into the composer, in Hebrew', () => {
    const instances: Array<Record<string, unknown>> = []
    class FakeRecognition {
      lang = ''
      interimResults = true
      onresult: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      start = vi.fn()
      stop = vi.fn()
      constructor() {
        instances.push(this as unknown as Record<string, unknown>)
      }
    }
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition)
    const onText = vi.fn()
    const { result } = renderHook(() =>
      useDictation({ locale: 'he', onText, onUnavailable: vi.fn(), onFailed: vi.fn() }),
    )
    act(() => result.current.toggle())
    expect(result.current.listening).toBe(true)
    const rec = instances.at(-1) as unknown as FakeRecognition
    expect(rec.lang).toBe('he-IL')
    act(() => rec.onresult?.({ results: [[{ transcript: 'אסימפטוטות' }]] }))
    expect(onText).toHaveBeenCalledWith('אסימפטוטות')
    act(() => rec.onend?.())
    expect(result.current.listening).toBe(false)
  })
})

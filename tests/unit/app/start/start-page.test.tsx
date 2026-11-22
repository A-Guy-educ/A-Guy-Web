// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { groupCourses } from '@/app/(frontend)/start/groupCourses'
import { StartPageClient } from '@/app/(frontend)/start/StartPageClient'
import type { Course } from '@/infra/types/content'
import { I18nProvider } from '@/ui/web/providers/I18n'
import { personaForSlug } from '@/ui/web/privateLesson/teacherPersonas'
import { TutorPortrait } from '@/ui/web/privateLesson/TutorPortrait'

import heMessages from '../../../../src/i18n/he.json'

vi.mock('@/client/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'u1' }, isLoading: false }),
}))
vi.mock('@/client/utils/guest-session-beacon', () => ({ trackOnboardingStep: vi.fn() }))
vi.mock('@/ui/web/auth/OnboardingCompleteLoginModal', () => ({
  OnboardingCompleteLoginModal: () => null,
}))

const course = (id: string, title: string): Course =>
  ({ id, title, slug: id, courseLabel: 'חטיבה' }) as unknown as Course

const COURSES = [
  course('physics', 'פיזיקה'),
  course('g7', 'כיתה ז׳'),
  course('g8-adv', "כיתה ח' - מתקדם "),
  course('g8-basic', "כיתה ח' - בסיס"),
  course('g12-372', 'כיתה יב  - שאלון 372'),
]

const PROFILES = [
  { slug: 'teacher_focused', label: 'מורה ממוקד', description: 'ממוקד' },
  { slug: 'teacher_patient', label: 'מורה סבלני', description: 'סבלני' },
  { slug: 'teacher_challenging', label: 'מורה מאתגר', description: 'מאתגר' },
]

describe('groupCourses', () => {
  it('splits "grade - level" titles into one group per grade, keeping order', () => {
    const groups = groupCourses(COURSES)
    expect(groups.map((g) => [g.label, g.tracks.map((t) => t.title)])).toEqual([
      ['פיזיקה', ['פיזיקה']],
      ['כיתה ז׳', ['כיתה ז׳']],
      ["כיתה ח'", ['מתקדם', 'בסיס']],
      ['כיתה יב', ['שאלון 372']],
    ])
  })
})

describe('personaForSlug', () => {
  it('maps the Admin profiles to the demo teachers and gives unknown ones a face', () => {
    expect(personaForSlug('teacher_patient')).toBe('detailed')
    expect(personaForSlug('teacher_focused')).toBe('focused')
    expect(personaForSlug('teacher_challenging')).toBe('attentive')
    expect(personaForSlug('teacher_new', 4)).toBe('focused')
    expect(personaForSlug(null)).toBe('detailed')
  })
})

describe('StartPageClient', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(url === '/api/teacher-profiles' ? { profiles: PROFILES } : {}),
          { status: 200 },
        ),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  const renderStart = (initialTeacherSlug?: string) =>
    render(
      <I18nProvider locale="he" messages={heMessages}>
        <StartPageClient
          courses={COURSES}
          direction="rtl"
          isNewUser
          initialTeacherSlug={initialTeacherSlug}
        />
      </I18nProvider>,
    )

  it('asks for a teacher with the demo names, in the demo order', async () => {
    renderStart()
    expect(screen.getByRole('heading', { name: 'איזה מורה תרצו?' })).toBeTruthy()
    await screen.findByText('החופר')
    const names = screen
      .getAllByRole('button')
      .map((b) => b.querySelector('strong')?.textContent)
      .filter(Boolean)
    expect(names).toEqual(['החופר', 'הממוקדת', 'הקשוב'])
  })

  it('saves the picked teacher and moves to the class step', async () => {
    renderStart()
    fireEvent.click(await screen.findByRole('button', { name: /הקשוב/ }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/user-settings',
      expect.objectContaining({
        body: JSON.stringify({ teacherProfileSlug: 'teacher_challenging' }),
      }),
    )
    expect(screen.getByRole('heading', { name: 'באיזו כיתה וברמה לומדים?' })).toBeTruthy()
    const proceed = screen.getByRole('button', { name: 'ממשיכים' })
    expect(proceed).toHaveProperty('disabled', true)

    fireEvent.click(screen.getByRole('button', { name: "כיתה ח' · בסיס" }))
    expect(proceed).toHaveProperty('disabled', false)

    fireEvent.click(screen.getByRole('button', { name: 'חזרה' }))
    expect(screen.getByRole('heading', { name: 'איזה מורה תרצו?' })).toBeTruthy()
  })

  it('opens on the class step when the landing page already picked a teacher', async () => {
    renderStart('teacher_focused')
    expect(await screen.findByRole('heading', { name: 'באיזו כיתה וברמה לומדים?' })).toBeTruthy()
  })

  it('still asks for a teacher when the landing slug is unknown', async () => {
    renderStart('nobody')
    await screen.findByText('החופר')
    expect(screen.getByRole('heading', { name: 'איזה מורה תרצו?' })).toBeTruthy()
  })
})

describe('TutorPortrait', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('says hello every 11 seconds and winks on click (החופר only)', () => {
    vi.useFakeTimers()
    render(
      <TutorPortrait persona="detailed" label="המורה שבחרתם — החופר" winkTitle="לחצו לקריצה" />,
    )
    const portrait = screen.getByRole('button', { name: 'המורה שבחרתם — החופר' })
    expect(portrait.className).not.toContain('quiet-hello')

    act(() => {
      vi.advanceTimersByTime(11000)
    })
    expect(portrait.className).toContain('quiet-hello')

    fireEvent.animationEnd(portrait)
    fireEvent.click(portrait)
    expect(portrait.className).toContain('wink-hello')
  })

  it('is a still image for the other teachers', () => {
    render(
      <TutorPortrait persona="focused" label="המורה שבחרתם — הממוקדת" winkTitle="לחצו לקריצה" />,
    )
    expect(screen.getByRole('img', { name: 'המורה שבחרתם — הממוקדת' })).toBeTruthy()
  })
})

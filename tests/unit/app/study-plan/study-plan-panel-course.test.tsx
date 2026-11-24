// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DayCard } from '@/app/(frontend)/study-plan/_components/DayCard'
import type { PlanCourse } from '@/app/(frontend)/study-plan/_components/planLessons'
import { StudyPlanPanel } from '@/app/(frontend)/study-plan/_components/StudyPlanPanel'
import { setExamDates } from '@/client/state/localStorage/examDates'
import type { StudyPlanDay, TopicInput } from '@/server/services/study-plan'
import { I18nProvider } from '@/ui/web/providers/I18n'

import heMessages from '../../../../src/i18n/he.json'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const course: PlanCourse = {
  id: 'course-1',
  slug: 'g8',
  title: 'כיתה ח׳',
  lessons: [
    { id: 'l1', title: 'משוואות בנעלם', slug: 'eq', chapterSlug: 'algebra', type: 'learning' },
    { id: 'p1', title: 'תרגול משוואות', slug: 'eq-p', chapterSlug: 'algebra', type: 'practice' },
    { id: 'x1', title: 'בחינה', slug: 'exam', chapterSlug: 'algebra', type: 'exam' },
  ],
}

const he = (ui: React.ReactNode) =>
  render(
    <I18nProvider locale="he" messages={heMessages}>
      {ui}
    </I18nProvider>,
  )

describe('StudyPlanPanel in a course', () => {
  const fetchMock = vi.fn()
  const topicsReply = (topics: unknown[]) =>
    new Response(JSON.stringify({ topics }), { status: 200 })

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/api/study-plan?')
          ? new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
          : topicsReply([
              { label: 'משוואות', learningLessonId: 'l1', practiceLessonId: 'p1' },
              { label: 'הסתברות', learningLessonId: null, practiceLessonId: null },
            ]),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  const topicsRequest = () => {
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/study-plan/topics')
    return call ? JSON.parse(call[1].body) : null
  }

  it("starts from the course's exam date", async () => {
    setExamDates(course.id, [{ id: 'e1', date: '2099-06-01' }])
    he(<StudyPlanPanel stacked course={course} />)
    await waitFor(() =>
      expect((document.querySelector('input[type="date"]') as HTMLInputElement).value).toBe(
        '2099-06-01',
      ),
    )
  })

  it("reads an uploaded topic list and adds each topic with the course's lessons", async () => {
    he(<StudyPlanPanel stacked course={course} />)
    const input = await screen.findByLabelText('צילום רשימה או העלאת מסמך', {
      selector: 'input',
    })
    const pdf = new File(['%PDF-1.4'], 'topics.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [pdf] } })

    expect(await screen.findByText('משוואות')).toBeTruthy()
    expect(screen.getByText('לימוד: משוואות בנעלם · תרגול: תרגול משוואות')).toBeTruthy()
    expect(screen.getByText('הסתברות')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('נוספו 2 נושאים')

    const body = topicsRequest()
    expect(body.file.mimeType).toBe('application/pdf')
    // Exam lessons are not plan material.
    expect(body.lessons.map((l: { id: string }) => l.id)).toEqual(['l1', 'p1'])
  })

  it('says so when a file is neither a photo nor a PDF', async () => {
    he(<StudyPlanPanel stacked course={course} />)
    const input = await screen.findByLabelText('צילום רשימה או העלאת מסמך', {
      selector: 'input',
    })
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] },
    })
    expect((await screen.findByRole('status')).textContent).toBe('אפשר להעלות תמונה או PDF.')
    expect(topicsRequest()).toBeNull()
  })

  it('matches a typed topic too', async () => {
    he(<StudyPlanPanel stacked course={course} />)
    fireEvent.change(await screen.findByPlaceholderText('הוסף נושא...'), {
      target: { value: 'משוואות' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'הוסף נושא' }))
    expect(await screen.findByText(/לימוד: משוואות בנעלם/)).toBeTruthy()
    expect(topicsRequest().text).toBe('משוואות')
  })
})

describe('DayCard', () => {
  const lessonRef = (id: string) => ({
    lessonId: id,
    lessonSlug: id,
    chapterSlug: 'algebra',
    courseSlug: 'g8',
    lessonTitle: id,
    lessonUrl: `/courses/g8/chapters/algebra/lessons/${id}`,
  })
  const topics: TopicInput[] = [
    {
      topicId: 'weak',
      topicLabel: 'משוואות',
      mastery: 'weak',
      learningRef: lessonRef('eq'),
      practiceRef: lessonRef('eq-p'),
    },
    {
      topicId: 'medium',
      topicLabel: 'פונקציה קווית',
      mastery: 'medium',
      learningRef: lessonRef('line'),
      practiceRef: lessonRef('line-p'),
    },
  ]
  const day = (dayId: string): StudyPlanDay => ({
    dayId,
    date: '2099-06-01',
    activityType: 'practice',
    topicIds: ['weak', 'medium'],
    status: 'planned',
    estimatedDurationMinutes: 45,
  })
  const first = new Map([
    ['weak', 'd1'],
    ['medium', 'd1'],
  ])

  afterEach(cleanup)

  // The accessible name trims the kind's leading space, hence the `\s*`.
  const link = (name: RegExp) => screen.getByRole('link', { name }).getAttribute('href')

  it('opens the learning lesson on a weak topic’s first day, practice otherwise', () => {
    he(<DayCard day={day('d1')} topics={topics} firstDayByTopic={first} onToggleStatus={vi.fn()} />)
    expect(link(/^משוואות\s*· לימוד$/)).toBe('/courses/g8/chapters/algebra/lessons/eq')
    expect(link(/^פונקציה קווית\s*· תרגול$/)).toBe('/courses/g8/chapters/algebra/lessons/line-p')
    cleanup()

    he(<DayCard day={day('d2')} topics={topics} firstDayByTopic={first} onToggleStatus={vi.fn()} />)
    expect(link(/^משוואות\s*· תרגול$/)).toBe('/courses/g8/chapters/algebra/lessons/eq-p')
  })
})

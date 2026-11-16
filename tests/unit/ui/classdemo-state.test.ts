import { describe, expect, it } from 'vitest'

import { isChromelessRoute } from '@/app/(frontend)/LayoutChromeGate'
import { DEMO_LESSONS, publishedLessons } from '@/ui/web/classdemo/classDemoLessons'
import { classDemoReducer, initialClassDemoState } from '@/ui/web/classdemo/classDemoState'
import type { ClassDemoAction, ClassDemoState } from '@/ui/web/classdemo/classDemoState'

const run = (actions: ClassDemoAction[], from: ClassDemoState = initialClassDemoState) =>
  actions.reduce(classDemoReducer, from)

describe('classDemoReducer', () => {
  it('enters the workspace matching the picked role', () => {
    const state = run([
      { type: 'register' },
      { type: 'pickRole', role: 'student' },
      { type: 'enter' },
    ])
    expect(state.screen).toBe('student')
    expect(state.tab).toBe('dashboard')
  })

  it('hides and re-shows a lesson for students without mutating the previous state', () => {
    const before = initialClassDemoState
    const hidden = classDemoReducer(before, { type: 'togglePublished', id: 'l1' })
    expect(publishedLessons(hidden.published).map((l) => l.id)).not.toContain('l1')
    expect(before.published).toContain('l1')

    const shown = classDemoReducer(hidden, { type: 'togglePublished', id: 'l4' })
    expect(publishedLessons(shown.published).map((l) => l.id)).toEqual(['l2', 'l3', 'l4', 'l7'])
  })

  it('keeps published lessons in lesson-bank order', () => {
    const state = run([
      { type: 'togglePublished', id: 'l6' },
      { type: 'togglePublished', id: 'l4' },
    ])
    const order = DEMO_LESSONS.map((l) => l.id).filter((id) => state.published.includes(id))
    expect(publishedLessons(state.published).map((l) => l.id)).toEqual(order)
  })

  it('round-trips the teacher student preview', () => {
    const teacher = run([{ type: 'enter' }, { type: 'showContent', screen: 'teacher' }])
    const preview = classDemoReducer(teacher, { type: 'startPreview' })
    expect(preview).toMatchObject({ screen: 'student', preview: true })
    expect(classDemoReducer(preview, { type: 'endPreview' })).toMatchObject({
      screen: 'teacher',
      tab: 'content',
      preview: false,
    })
  })

  it('applies the filter to whichever workspace is open', () => {
    const teacher = run([{ type: 'enter' }, { type: 'setFilter', filter: 'exam' }])
    expect(teacher).toMatchObject({ teacherFilter: 'exam', studentFilter: 'all' })
  })

  it('marks a lesson complete once and closes the preview', () => {
    const state = run([
      { type: 'openLesson', id: 'l1' },
      { type: 'completeLesson', id: 'l1' },
      { type: 'completeLesson', id: 'l1' },
    ])
    expect(state.done.filter((id) => id === 'l1')).toHaveLength(1)
    expect(state.openLessonId).toBeNull()
  })
})

describe('isChromelessRoute', () => {
  it('hides site chrome on /classdemo', () => {
    expect(isChromelessRoute('/classdemo')).toBe(true)
    expect(isChromelessRoute('/classdemos')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import {
  firstDayByTopic,
  lessonForTopicDay,
  type PlanCourse,
} from '@/app/(frontend)/study-plan/_components/planLessons'
import { toPlanTopics } from '@/app/(frontend)/study-plan/_components/useExamTopicMatching'
import type { LessonRef, StudyPlanDay, TopicInput } from '@/server/services/study-plan'

const ref = (id: string): LessonRef => ({
  lessonId: id,
  lessonSlug: id,
  chapterSlug: 'ch',
  courseSlug: 'c',
  lessonTitle: id,
  lessonUrl: `/courses/c/chapters/ch/lessons/${id}`,
})

const topic = (mastery: TopicInput['mastery'], refs: Partial<TopicInput> = {}): TopicInput => ({
  topicId: 't',
  topicLabel: 'משוואות',
  mastery,
  learningRef: ref('learn'),
  practiceRef: ref('practice'),
  ...refs,
})

describe('lessonForTopicDay', () => {
  it('starts a weak topic with its learning lesson, then practises', () => {
    expect(lessonForTopicDay(topic('weak'), true)).toEqual({
      ref: ref('learn'),
      kind: 'learning',
    })
    expect(lessonForTopicDay(topic('weak'), false)?.kind).toBe('practice')
  })

  it('sends medium and strong topics straight to practice', () => {
    expect(lessonForTopicDay(topic('medium'), true)?.kind).toBe('practice')
    expect(lessonForTopicDay(topic('strong'), true)?.kind).toBe('practice')
  })

  it('falls back to whichever lesson the topic has', () => {
    expect(lessonForTopicDay(topic('strong', { practiceRef: undefined }), false)?.kind).toBe(
      'learning',
    )
    expect(lessonForTopicDay(topic('weak', { learningRef: undefined }), true)?.kind).toBe(
      'practice',
    )
  })

  it("keeps a syllabus pick's single lesson, and has nothing for a plain topic", () => {
    const picked = topic('weak', {
      learningRef: undefined,
      practiceRef: undefined,
      lessonRef: ref('picked'),
    })
    expect(lessonForTopicDay(picked, true)).toEqual({ ref: ref('picked'), kind: null })
    expect(
      lessonForTopicDay(topic('weak', { learningRef: undefined, practiceRef: undefined }), true),
    ).toBeNull()
  })
})

describe('firstDayByTopic', () => {
  it("finds each topic's first day, honouring the student's own topic picks", () => {
    const day = (dayId: string, topicIds: string[], userTopicIds?: string[]) =>
      ({ dayId, topicIds, userTopicIds }) as StudyPlanDay
    const first = firstDayByTopic([
      day('d1', ['a']),
      day('d2', ['a', 'b'], ['c']),
      day('d3', ['b', 'c']),
    ])
    expect(Object.fromEntries(first)).toEqual({ a: 'd1', c: 'd2', b: 'd3' })
  })
})

describe('toPlanTopics', () => {
  const course: PlanCourse = {
    id: 'course-1',
    slug: 'g8',
    title: 'כיתה ח׳',
    lessons: [
      { id: 'l1', title: 'משוואות', slug: 'eq', chapterSlug: 'algebra', type: 'learning' },
      { id: 'p1', title: 'תרגול', slug: 'eq-p', chapterSlug: 'algebra', type: 'practice' },
    ],
  }

  it('links matched topics to the course lessons, rated medium', () => {
    const [matched, unmatched] = toPlanTopics(
      course,
      [
        { label: 'משוואות', learningLessonId: 'l1', practiceLessonId: 'p1' },
        { label: 'הסתברות', learningLessonId: null, practiceLessonId: 'gone' },
      ],
      7,
    )
    expect(matched).toEqual({
      topicId: 'topic-7-0',
      topicLabel: 'משוואות',
      mastery: 'medium',
      learningRef: {
        lessonId: 'l1',
        lessonSlug: 'eq',
        chapterSlug: 'algebra',
        courseSlug: 'g8',
        lessonTitle: 'משוואות',
        lessonUrl: '/courses/g8/chapters/algebra/lessons/eq',
      },
      practiceRef: expect.objectContaining({ lessonId: 'p1' }),
    })
    expect(unmatched).toEqual({ topicId: 'topic-7-1', topicLabel: 'הסתברות', mastery: 'medium' })
  })
})

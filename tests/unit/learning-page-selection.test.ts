import { describe, expect, it } from 'vitest'

import { resolveLearningPageSelection } from '@/app/(frontend)/study/learningPageSelection'

describe('resolveLearningPageSelection', () => {
  it('uses cookies when no query params are present', () => {
    expect(
      resolveLearningPageSelection({
        cookieCourseId: 'cookie-course',
        cookieGrade: '7',
        systemLocale: 'he',
      }),
    ).toEqual({
      contentLocale: 'he',
      courseId: 'cookie-course',
      grade: '7',
    })
  })

  it('lets query params override cookies for preview views', () => {
    expect(
      resolveLearningPageSelection({
        cookieCourseId: 'cookie-course',
        cookieGrade: '7',
        searchParams: {
          courseId: 'query-course',
          grade: '9',
          locale: 'he',
        },
        systemLocale: 'en',
      }),
    ).toEqual({
      contentLocale: 'he',
      courseId: 'query-course',
      grade: '9',
    })
  })

  it('ignores empty query values', () => {
    expect(
      resolveLearningPageSelection({
        cookieCourseId: 'cookie-course',
        cookieGrade: '7',
        searchParams: {
          courseId: ' ',
          grade: [''],
          locale: 'bad-locale',
        },
        systemLocale: 'he',
      }),
    ).toEqual({
      contentLocale: 'he',
      courseId: 'cookie-course',
      grade: '7',
    })
  })
})

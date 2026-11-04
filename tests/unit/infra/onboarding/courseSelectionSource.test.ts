import { describe, expect, it } from 'vitest'

import { pickCourseSelection } from '@/infra/onboarding/courseSelectionSource'

const SERVER = { courseId: 'server-course', gradeLevel: '9' }
const COOKIES = { courseId: 'cookie-course', grade: '8' }

describe('pickCourseSelection', () => {
  it('guests use the cookies', () => {
    expect(pickCourseSelection({ userId: null, cookies: COOKIES, server: null })).toEqual({
      courseId: 'cookie-course',
      grade: '8',
    })
  })

  it('cookies owned by the signed-in user win (a fresh pick beats the async server write)', () => {
    expect(
      pickCourseSelection({
        userId: 'user-a',
        cookies: { ...COOKIES, owner: 'user-a' },
        server: SERVER,
      }),
    ).toEqual({ courseId: 'cookie-course', grade: '8' })
  })

  it("another student's cookies are ignored in favour of the server record", () => {
    expect(
      pickCourseSelection({
        userId: 'user-a',
        cookies: { ...COOKIES, owner: 'user-b' },
        server: SERVER,
      }),
    ).toEqual({ courseId: 'server-course', grade: '9' })
  })

  it('unowned cookies are ignored in favour of the server record', () => {
    expect(pickCourseSelection({ userId: 'user-a', cookies: COOKIES, server: SERVER })).toEqual({
      courseId: 'server-course',
      grade: '9',
    })
  })

  it("another student's cookies are never used, even with no server record", () => {
    expect(
      pickCourseSelection({
        userId: 'user-a',
        cookies: { ...COOKIES, owner: 'user-b' },
        server: null,
      }),
    ).toEqual({})
  })

  it('owned grade-only cookies are used when the server has no course', () => {
    expect(
      pickCourseSelection({
        userId: 'user-a',
        cookies: { grade: '8', owner: 'user-a' },
        server: null,
      }),
    ).toEqual({ courseId: undefined, grade: '8' })
  })
})

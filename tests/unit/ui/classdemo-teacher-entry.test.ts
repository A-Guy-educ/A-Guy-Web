import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getMeUser = vi.fn()
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`)
})

vi.mock('@/infra/utils/getMeUser', () => ({ getMeUser: () => getMeUser() }))
vi.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to) }))

const { default: ClassDemoTeacherPage } = await import('@/app/(frontend)/classdemo/teacher/page')
const { getTeacherAppUrl } = await import('@/infra/config/teacher-app')

const visit = async () => {
  try {
    await ClassDemoTeacherPage()
    return 'rendered'
  } catch (error) {
    return (error as Error).message
  }
}

describe('/classdemo/teacher', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    getMeUser.mockReset()
  })

  it('sends signed-out visitors to login and back here', async () => {
    getMeUser.mockResolvedValue({ user: null })
    expect(await visit()).toBe('REDIRECT:/login?returnTo=%2Fclassdemo%2Fteacher')
  })

  it.each(['teacher', 'admin'])('sends a %s to the teacher app', async (role) => {
    getMeUser.mockResolvedValue({ user: { id: 'u1', role } })
    expect(await visit()).toBe('REDIRECT:https://teacher.aguy.co.il/')
  })

  it('keeps other roles here with an explanation', async () => {
    getMeUser.mockResolvedValue({ user: { id: 'u1', role: 'student' } })
    expect(await visit()).toBe('rendered')
  })
})

describe('getTeacherAppUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('uses TEACHER_APP_URL when it is a valid URL', () => {
    vi.stubEnv('TEACHER_APP_URL', 'https://teacher.dev.aguy.co.il')
    expect(getTeacherAppUrl()).toBe('https://teacher.dev.aguy.co.il/')
  })

  it('falls back to production when unset or invalid', () => {
    vi.stubEnv('TEACHER_APP_URL', 'not a url')
    expect(getTeacherAppUrl()).toBe('https://teacher.aguy.co.il/')
  })
})

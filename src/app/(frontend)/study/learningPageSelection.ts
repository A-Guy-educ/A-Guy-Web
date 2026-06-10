import { isValidContentLocale, type ContentLocale } from '@/infra/types/content'

export type LearningPageSearchParams = {
  courseId?: string | string[]
  grade?: string | string[]
  locale?: string | string[]
}

export interface LearningPageSelectionInput {
  cookieCourseId?: string
  cookieGrade?: string
  searchParams?: LearningPageSearchParams
  systemLocale: string
}

export interface LearningPageSelection {
  contentLocale?: ContentLocale
  courseId?: string
  grade?: string
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed || undefined
}

export function resolveLearningPageSelection({
  cookieCourseId,
  cookieGrade,
  searchParams,
  systemLocale,
}: LearningPageSelectionInput): LearningPageSelection {
  const queryGrade = firstParam(searchParams?.grade)
  const queryCourseId = firstParam(searchParams?.courseId)
  const queryLocale = firstParam(searchParams?.locale)
  const locale =
    queryLocale && isValidContentLocale(queryLocale)
      ? queryLocale
      : isValidContentLocale(systemLocale)
        ? systemLocale
        : undefined

  return {
    contentLocale: locale,
    courseId: queryCourseId ?? cookieCourseId,
    grade: queryGrade ?? cookieGrade,
  }
}

import { cache } from 'react'

import type { ContentLocale, FormulaSheet, Lesson, Course } from '@/infra/types/content'
import { findByIdSerialized, relationId } from '../mongo'

export interface ResolvedFormulaSheet {
  sheet: FormulaSheet
  source: 'lesson' | 'course'
}

function getOppositeLocale(locale: ContentLocale): ContentLocale {
  return locale === 'en' ? 'he' : 'en'
}

async function fetchFormulaSheet(id: string, locale: ContentLocale): Promise<FormulaSheet | null> {
  const sheet = await findByIdSerialized<FormulaSheet & { name?: string }>('formula-sheets', id)
  if (!sheet) return null
  if (sheet.locale && sheet.locale !== locale && sheet.locale !== getOppositeLocale(locale)) {
    return null
  }
  return { ...sheet, title: sheet.title || sheet.name || '' }
}

export const resolveFormulaSheet = cache(
  async ({
    lessonId,
    courseId,
    locale,
  }: {
    lessonId: string
    courseId: string
    locale: ContentLocale
  }): Promise<ResolvedFormulaSheet | null> => {
    const lesson = await findByIdSerialized<Lesson>('lessons', lessonId)
    const lessonSheetId = relationId(lesson?.formulaSheet)
    if (lessonSheetId) {
      const sheet = await fetchFormulaSheet(lessonSheetId, locale)
      if (sheet) return { sheet, source: 'lesson' }
    }

    const course = await findByIdSerialized<Course>('courses', courseId)
    const courseSheetId = relationId(course?.formulaSheet)
    if (courseSheetId) {
      const sheet = await fetchFormulaSheet(courseSheetId, locale)
      if (sheet) return { sheet, source: 'course' }
    }

    return null
  },
)

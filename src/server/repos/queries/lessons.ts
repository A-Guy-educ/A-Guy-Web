import { cache } from 'react'

import type { Chapter, Course, Lesson } from '@/infra/types/content'
import {
  findByIdSerialized,
  findManySerialized,
  findOneSerialized,
  objectIdFromString,
  relationId,
  visibleContentFilter,
} from '../mongo'
import { queryChaptersByCourse } from './chapters'

async function populateLesson(lesson: Lesson): Promise<Lesson | null> {
  const chapterId = relationId(lesson.chapter)
  if (!chapterId) return null

  const chapter = await findByIdSerialized<Chapter>('chapters', chapterId)
  if (!chapter || chapter.status !== 'published' || !chapter.isActive) return null

  const courseId = relationId(chapter.course)
  if (!courseId) return null

  const course = await findByIdSerialized<Course>('courses', courseId)
  if (!course || course.status !== 'published' || !course.isActive) return null

  return { ...lesson, chapter: { ...chapter, course } }
}

export const queryLessonsByChapter = cache(async ({ chapterId }: { chapterId: string }) => {
  const chapter = await findByIdSerialized<Chapter>('chapters', chapterId)
  if (!chapter || chapter.status !== 'published' || !chapter.isActive) return []

  const course = await findByIdSerialized<Course>('courses', relationId(chapter.course) || '')
  if (!course || course.status !== 'published' || !course.isActive) return []

  const lessons = await findManySerialized<Lesson>(
    'lessons',
    visibleContentFilter({ chapter: objectIdFromString(chapterId) }),
    { sort: { order: 1 } },
  )

  return lessons.map((lesson) => ({ ...lesson, chapter: { ...chapter, course } }))
})

export const queryLessonBySlug = cache(async ({ slug }: { slug: string }) => {
  const lesson = await findOneSerialized<Lesson>('lessons', visibleContentFilter({ slug }))
  return lesson ? populateLesson(lesson) : null
})

export const queryLessonsByCourse = cache(async ({ courseId }: { courseId: string }) => {
  const course = await findByIdSerialized<Course>('courses', courseId)
  if (!course || course.status !== 'published' || !course.isActive) return []

  const chapters = await queryChaptersByCourse({ courseId })
  const chapterIds = chapters.map((chapter) => chapter.id)
  if (chapterIds.length === 0) return []

  const lessons = await findManySerialized<Lesson>(
    'lessons',
    visibleContentFilter({ chapter: { $in: chapterIds.map(objectIdFromString) } }),
    { sort: { order: 1 } },
  )

  const chapterMap = new Map(chapters.map((chapter, index) => [chapter.id, { chapter, index }]))

  return lessons
    .map((lesson) => {
      const chapterId = relationId(lesson.chapter)
      const item = chapterId ? chapterMap.get(chapterId) : null
      return item ? { ...lesson, chapter: item.chapter } : lesson
    })
    .sort((a, b) => {
      const chapterA = chapterMap.get(relationId(a.chapter) || '')?.index ?? Infinity
      const chapterB = chapterMap.get(relationId(b.chapter) || '')?.index ?? Infinity
      if (chapterA !== chapterB) return chapterA - chapterB
      return (a.order ?? Infinity) - (b.order ?? Infinity)
    })
})

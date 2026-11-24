'use client'

/**
 * Sends an exam's topic list — a photo, a PDF, or typed text — to
 * `/api/study-plan/topics` and turns the answer into plan topics linked to the
 * course's closest learning and practice lessons (see planLessons). Photos are
 * downscaled like the composer's; PDFs go as they are, within the route's cap.
 *
 * @fileType hook
 * @domain lessons
 */
import { useCallback, useState } from 'react'

import {
  downscaleImageForSuggest,
  isSuggestableImage,
} from '@/app/(frontend)/courses/[courseSlug]/_components/CourseComposer/courseComposerImage'
import type {
  ExamTopicsFile,
  MatchedExamTopic,
} from '@/server/services/exam-topics/matchExamTopics'
import type { TopicInput } from '@/server/services/study-plan'
import { lessonRefFor, type PlanCourse } from './planLessons'

/** The route takes ~2.2 MB decoded. */
const MAX_PDF_BYTES = 2_200_000
const MAX_LESSONS = 300

export type TopicMatchError = 'tooLarge' | 'unsupported' | 'failed'

export class TopicMatchFailure extends Error {
  constructor(readonly reason: TopicMatchError) {
    super(reason)
  }
}

async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

async function fileForMatching(file: File): Promise<ExamTopicsFile> {
  if (isSuggestableImage(file)) {
    const image = await downscaleImageForSuggest(file)
    return { mimeType: 'image/jpeg', data: image.data }
  }
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new TopicMatchFailure('tooLarge')
    return { mimeType: 'application/pdf', data: await toBase64(file) }
  }
  throw new TopicMatchFailure('unsupported')
}

/** Matched topics as plan topics, rated medium until the student says otherwise. */
export function toPlanTopics(
  course: PlanCourse,
  matched: MatchedExamTopic[],
  now = Date.now(),
): TopicInput[] {
  const byId = new Map(course.lessons.map((lesson) => [lesson.id, lesson]))
  const refFor = (id: string | null) => {
    const lesson = id ? byId.get(id) : undefined
    return lesson ? lessonRefFor(course, lesson) : undefined
  }
  return matched.map((topic, i) => {
    const learningRef = refFor(topic.learningLessonId)
    const practiceRef = refFor(topic.practiceLessonId)
    return {
      topicId: `topic-${now}-${i}`,
      topicLabel: topic.label,
      mastery: 'medium',
      ...(learningRef ? { learningRef } : {}),
      ...(practiceRef ? { practiceRef } : {}),
    }
  })
}

export function useExamTopicMatching(course: PlanCourse | undefined, locale: 'en' | 'he') {
  const [isMatching, setIsMatching] = useState(false)

  const match = useCallback(
    async (input: { text?: string; file?: File }): Promise<TopicInput[]> => {
      if (!course) return []
      setIsMatching(true)
      try {
        const file = input.file ? await fileForMatching(input.file) : undefined
        const res = await fetch('/api/study-plan/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            locale,
            courseTitle: course.title,
            lessons: course.lessons
              .filter((lesson) => lesson.type !== 'exam')
              .slice(0, MAX_LESSONS)
              .map((lesson) => ({
                id: lesson.id,
                title: lesson.title,
                chapter: lesson.chapterTitle,
                type: lesson.type,
              })),
            text: input.text,
            file,
          }),
        })
        if (!res.ok) throw new TopicMatchFailure('failed')
        const data = (await res.json()) as { topics?: MatchedExamTopic[] }
        return toPlanTopics(course, data.topics ?? [])
      } finally {
        setIsMatching(false)
      }
    },
    [course, locale],
  )

  return { match, isMatching }
}

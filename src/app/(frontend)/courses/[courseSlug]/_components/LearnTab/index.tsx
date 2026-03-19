'use client'

import { useMemo } from 'react'
import type { Chapter, Lesson } from '@/payload-types'
import { getEffectiveLessonType } from '@/server/constants/lesson-types'
import { useTranslations } from '@/ui/web/providers/I18n'
import { useProgressMap } from '@/client/hooks/useProgressMap'
import { CourseLessonCard } from '../CourseLessonCard'

interface LearnTabProps {
  lessons: Lesson[]
  chapters: Chapter[]
  courseSlug: string
  tabColor?: { text: string; stroke: string }
}

export function LearnTab({ lessons, chapters, courseSlug, tabColor }: LearnTabProps) {
  const t = useTranslations('coursePage')
  const learningLessons = lessons.filter((l) => getEffectiveLessonType(l.type) === 'learning')

  const lessonIds = useMemo(() => learningLessons.map((l) => l.id), [learningLessons])
  const { progressMap, statusMap } = useProgressMap({ recordType: 'lesson', recordIds: lessonIds })

  if (learningLessons.length === 0) {
    return null
  }

  const completedCount = Object.values(statusMap).filter((s) => s === 'completed').length
  const inProgressCount = Object.values(statusMap).filter((s) => s === 'in_progress').length
  const notStartedCount = learningLessons.length - completedCount - inProgressCount

  return (
    <>
      <div className="flex gap-2 justify-center mb-6 flex-wrap">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
          <span style={{ color: tabColor?.stroke }}>{completedCount}</span> {t('statusCompleted')}
        </span>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
          <span style={{ color: tabColor?.stroke }}>{inProgressCount}</span> {t('statusInProgress')}
        </span>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
          <span style={{ color: tabColor?.stroke }}>{notStartedCount}</span> {t('statusNotStarted')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {learningLessons.map((lesson, idx) => {
          const chapter = chapters.find((ch) => {
            const lessonChapterId =
              typeof lesson.chapter === 'string' ? lesson.chapter : lesson.chapter?.id
            return ch.id === lessonChapterId
          })
          const chapterSlug = chapter?.slug ?? ''

          return (
            <CourseLessonCard
              key={lesson.id}
              lesson={lesson}
              index={idx + 1}
              courseSlug={courseSlug}
              chapterSlug={chapterSlug}
              tabColor={tabColor}
              progress={progressMap[lesson.id] ?? 0}
            />
          )
        })}
      </div>
    </>
  )
}

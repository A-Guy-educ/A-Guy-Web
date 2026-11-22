/**
 * "השיעור האחרון" — the demo's card for the lesson the student was on: its
 * type and chapter, title, how far they got, and a button back in.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useTranslations } from '@/ui/web/providers/I18n'

import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'

interface CourseLastLessonProps {
  node: LessonSearchNode
  href: string
  percent: number
}

export function CourseLastLesson({ node, href, percent }: CourseLastLessonProps) {
  const t = useTranslations('coursePage.hub')
  const type = [t(`lessonTypes.${node.lessonType}`), node.chapterTitle].filter(Boolean).join(' · ')

  return (
    <article className="last-lesson" aria-label={node.lesson.title}>
      <div>
        <div className="last-info">{type}</div>
        <div className="last-title">{node.lesson.title}</div>
        <div className="last-info">{t('lastDescription')}</div>
        <div className="resume-progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        </div>
      </div>
      <SystemLink href={href} className="pill primary-pill">
        {t('resume')}
      </SystemLink>
    </article>
  )
}

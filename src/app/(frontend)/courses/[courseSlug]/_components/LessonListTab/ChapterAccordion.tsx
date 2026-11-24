/**
 * @fileType component
 * @domain frontend
 * @pattern lesson-roadmap-chapter
 * @ai-summary One chapter as a Radix accordion item in the demo's shell — bookmark mark, "פרק N · X שיעורים" over the chapter title, a done-count progress track, and a round chevron; the expandable body holds the chapter description and the grid of LessonRow cards (unchanged).
 */

'use client'

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { useTranslations } from '@/ui/web/providers/I18n'
import { formatMessage } from './formatMessage'
import { LessonRow } from './LessonRow'
import type { ChapterRoadmapGroup, LessonRoadmapNode } from './lessonRoadmapTypes'

interface ChapterAccordionProps {
  group: ChapterRoadmapGroup
  visibleLessons: LessonRoadmapNode[]
  courseSlug: string
  purchaseHref?: string
}

export function ChapterAccordion({
  group,
  visibleLessons,
  courseSlug,
  purchaseHref,
}: ChapterAccordionProps) {
  const t = useTranslations('coursePage')
  const { chapter, chapterIndex, completedCount, totalCount } = group
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const meta = formatMessage(t(totalCount === 1 ? 'hub.chapterMetaOne' : 'hub.chapterMeta'), {
    num: chapterIndex + 1,
    count: totalCount,
  })

  return (
    <AccordionPrimitive.Item
      value={chapter.id}
      className="lesson-chapter"
      id={`chapter-container-${chapter.id}`}
    >
      <AccordionPrimitive.Header asChild>
        <div>
          <AccordionPrimitive.Trigger className="lesson-chapter-summary">
            <span className="chapter-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="pl-icon">
                <path d="M7 3h10v18l-5-4-5 4z" />
              </svg>
            </span>
            <span className="chapter-heading">
              <small>{meta}</small>
              <strong>{chapter.title}</strong>
            </span>
            <span className="chapter-progress">
              <span className="chapter-track" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </span>
              <small>
                {formatMessage(t('hub.chapterDone'), { done: completedCount, total: totalCount })}
              </small>
            </span>
            <span className="chapter-toggle" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="pl-icon">
                <path d="m7 10 5 5 5-5" />
              </svg>
            </span>
          </AccordionPrimitive.Trigger>
        </div>
      </AccordionPrimitive.Header>

      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="chapter-lessons">
          {chapter.description && (
            <p className="text-body-xs text-muted-foreground mb-content-gap-sm ms-2">
              {chapter.description}
            </p>
          )}

          {visibleLessons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-content-gap-xs items-stretch">
              {visibleLessons.map((node) => (
                <LessonRow
                  key={node.lesson.id}
                  node={node}
                  courseSlug={courseSlug}
                  purchaseHref={purchaseHref}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-content-gap text-body-xs text-muted-foreground">
              {t('roadmapEmptyChapter')}
            </div>
          )}
        </div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  )
}

/**
 * Chat-style composer that replaces the compact quick-search button. Always
 * visible above the tab content; live-filters lessons on every keystroke and
 * falls back to a Gemini suggestion when the local search returns nothing.
 * The AI reply persists until a new query produces results or a new AI reply
 * arrives — it does not blink on every keystroke.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import { ArrowUp, Search, Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/infra/utils/ui'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import type { LessonType } from '@/server/constants/lesson-types'
import type { LessonSuggestInputLesson } from '@/server/services/lesson-suggest/generateLessonSuggestion'
import type { CourseTab } from '../CourseTabs'
import { TAB_COLORS } from '../CourseTabs'
import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'
import { useCourseComposerState } from './useCourseComposerState'

interface CourseComposerProps {
  nodes: LessonSearchNode[]
  courseSlug: string
  courseTitle: string
  lessonsForSuggest: LessonSuggestInputLesson[]
  activeTab: CourseTab
}

const MAX_CHIPS = 3

const CHIP_TAB_TO_LESSON_TYPE: Partial<Record<CourseTab, LessonType>> = {
  learn: 'learning',
  practice: 'practice',
  exams: 'exam',
}

const BADGE_CLASSES: Record<LessonType, string> = {
  learning: 'bg-tab-learn/10 text-tab-learn border-tab-learn/30',
  practice: 'bg-tab-practice/10 text-tab-practice border-tab-practice/30',
  exam: 'bg-tab-exams/10 text-tab-exams border-tab-exams/30',
}

function buildHref(node: LessonSearchNode, courseSlug: string): string | null {
  if (!node.chapterSlug) return null
  return `/courses/${courseSlug}/chapters/${node.chapterSlug}/lessons/${node.lesson.slug}`
}

export function CourseComposer({
  nodes,
  courseSlug,
  courseTitle,
  lessonsForSuggest,
  activeTab,
}: CourseComposerProps) {
  const t = useTranslations('coursePage.composer')
  const tPage = useTranslations('coursePage')
  const locale = useLocale() as 'en' | 'he'
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])

  const { query, setQuery, filtered, aiMessage, aiLoading, aiError, selectedIdx, setSelectedIdx } =
    useCourseComposerState({
      nodes,
      courseTitle,
      lessonsForSuggest,
      locale,
      activeTab,
    })

  const activeColor = TAB_COLORS[activeTab]
  const placeholderKey =
    activeTab === 'learn'
      ? 'placeholder.learn'
      : activeTab === 'practice'
        ? 'placeholder.practice'
        : activeTab === 'exams'
          ? 'placeholder.exams'
          : 'placeholder.ask'

  const chipLessonType = CHIP_TAB_TO_LESSON_TYPE[activeTab]
  const chips = chipLessonType
    ? nodes.filter((n) => n.lessonType === chipLessonType).slice(0, MAX_CHIPS)
    : []

  // Auto-grow the textarea to fit content, capped at ~4 rows.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [query])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (filtered.length > 0) {
        itemRefs.current[selectedIdx]?.click()
      }
      return
    }
    if (filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((idx) => (idx + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((idx) => (idx - 1 + filtered.length) % filtered.length)
    }
  }

  const showResults = filtered.length > 0
  const showAiMessage = !showResults && (aiLoading || aiMessage || aiError)

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        className="bg-card border border-border rounded-3xl shadow-elevation-2 px-4 py-3 transition-colors"
        style={{ borderColor: query ? activeColor.stroke : undefined }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t(placeholderKey)}
          className="w-full resize-none bg-transparent text-body-md text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[28px] max-h-[140px]"
        />

        <div className="mt-2 flex items-center justify-between gap-content-gap-xs">
          <div className="flex flex-wrap items-center gap-1.5 min-h-[28px] overflow-hidden">
            {chips.map((chip) => (
              <button
                key={`${chip.lessonType}-${chip.lesson.id}`}
                type="button"
                onClick={() => {
                  setQuery(chip.lesson.title ?? '')
                  textareaRef.current?.focus()
                }}
                className="text-body-xs text-muted-foreground bg-muted/60 hover:bg-muted rounded-full px-2.5 py-1 max-w-[220px] truncate"
                title={chip.lesson.title ?? ''}
              >
                {chip.lesson.title}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (filtered.length > 0) itemRefs.current[selectedIdx]?.click()
            }}
            aria-label={t('send')}
            disabled={!query.trim()}
            className={cn(
              'shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all',
              query.trim()
                ? 'text-white hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
            style={query.trim() ? { backgroundColor: activeColor.stroke } : undefined}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showResults && (
        <div className="mt-2 bg-card border border-border rounded-2xl shadow-elevation-2 overflow-hidden">
          {filtered.map((n, idx) => {
            const href = buildHref(n, courseSlug)
            if (!href) return null
            return (
              <SystemLink
                key={`${n.lessonType}-${n.lesson.id}`}
                href={href}
                ref={(el) => {
                  itemRefs.current[idx] = el
                }}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={cn(
                  'w-full px-4 py-2.5 flex items-center justify-between text-body-sm transition text-start',
                  idx === selectedIdx
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50',
                )}
              >
                <div className="flex items-center gap-content-gap-xs truncate min-w-0">
                  <Search className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{n.lesson.title}</span>
                </div>
                <span
                  className={cn(
                    'shrink-0 ms-2 text-body-2xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                    BADGE_CLASSES[n.lessonType],
                  )}
                >
                  {tPage(`quickSearchType.${n.lessonType}`)}
                </span>
              </SystemLink>
            )
          })}
        </div>
      )}

      {showAiMessage && (
        <div
          className="mt-2 flex items-start gap-content-gap-xs bg-muted/40 border border-border rounded-2xl px-4 py-3 text-body-sm text-foreground"
          role="status"
          aria-live="polite"
        >
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: activeColor.stroke }} />
          <div className="flex-1">
            {aiLoading && !aiMessage && (
              <span className="text-muted-foreground">{t('thinking')}</span>
            )}
            {!aiLoading && aiMessage && <span>{aiMessage}</span>}
            {!aiLoading && !aiMessage && aiError && (
              <span className="text-muted-foreground">{t('suggestError')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

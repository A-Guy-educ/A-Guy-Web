/**
 * The AI reply under the composer: one friendly sentence, the lessons it
 * picked as real links, and a next step that fits the intent — solving the
 * exercise together in Ask for homework, the exams tab for test prep.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import { cn } from '@/infra/utils/ui'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { ComposerSuggestion } from './courseComposerSuggest'
import { BADGE_CLASSES, buildLessonHref } from './courseComposerLinks'

interface CourseComposerSuggestionProps {
  suggestion: ComposerSuggestion | null
  loading: boolean
  error: boolean
  courseSlug: string
  accentColor: string
  /** A photo is attached: solving it in Ask is always on offer. */
  hasPhoto: boolean
  askBusy: boolean
  onSolveInAsk: () => void
  onOpenExams: () => void
}

export function CourseComposerSuggestion({
  suggestion,
  loading,
  error,
  courseSlug,
  accentColor,
  hasPhoto,
  askBusy,
  onSolveInAsk,
  onOpenExams,
}: CourseComposerSuggestionProps) {
  const t = useTranslations('coursePage.composer')
  const tPage = useTranslations('coursePage')

  const showAsk = !loading && (hasPhoto || suggestion?.intent === 'homework')
  const showExams = !loading && suggestion?.intent === 'exam'

  return (
    <div
      className="mt-2 bg-muted/40 border border-border rounded-2xl px-4 py-3 text-body-sm text-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-content-gap-xs">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentColor }} />
        <div className="flex-1">
          {loading && <span className="text-muted-foreground">{t('thinking')}</span>}
          {!loading && suggestion && <span>{suggestion.message || t('noLessonsFallback')}</span>}
          {!loading && !suggestion && error && (
            <span className="text-muted-foreground">{t('suggestError')}</span>
          )}
        </div>
      </div>

      {!loading && suggestion && suggestion.lessons.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {suggestion.lessons.map((node) => {
            const href = buildLessonHref(node, courseSlug)
            if (!href) return null
            return (
              <li key={`${node.lessonType}-${node.lesson.id}`}>
                <SystemLink
                  href={href}
                  className="flex items-center justify-between gap-content-gap-xs rounded-xl bg-card border border-border px-3 py-2 hover:bg-muted transition-colors"
                >
                  <span className="truncate font-medium">{node.lesson.title}</span>
                  <span
                    className={cn(
                      'shrink-0 text-body-2xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                      BADGE_CLASSES[node.lessonType],
                    )}
                  >
                    {tPage(`quickSearchType.${node.lessonType}`)}
                  </span>
                </SystemLink>
              </li>
            )
          })}
        </ul>
      )}

      {(showAsk || showExams) && (
        <div className="mt-2 flex flex-wrap gap-content-gap-xs">
          {showAsk && (
            <button
              type="button"
              onClick={onSolveInAsk}
              disabled={askBusy}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm font-medium text-white hover:opacity-90 disabled:opacity-disabled"
              style={{ backgroundColor: accentColor }}
            >
              <MessageCircle className="w-4 h-4" />
              {t('solveInAsk')}
            </button>
          )}
          {showExams && (
            <button
              type="button"
              onClick={onOpenExams}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm font-medium border border-border bg-card hover:bg-muted"
            >
              {t('openExams')}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

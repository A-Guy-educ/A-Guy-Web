/**
 * @fileType component
 * @domain frontend
 * @pattern lesson-quick-search
 * @ai-summary Compact search trigger + floating dropdown that filters the current tab's lessons by title or displayIndex and navigates to the picked lesson. Cmd/Ctrl+K opens; arrows + Enter navigate; Esc / outside click closes.
 */

'use client'

import { Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/infra/utils/ui'
import { useRouterWithLoading } from '@/infra/loading/hooks/useRouterWithLoading'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { LessonRoadmapNode } from './lessonRoadmapTypes'
import { useLessonQuickSearchState } from './useLessonQuickSearchState'

interface LessonQuickSearchProps {
  nodes: LessonRoadmapNode[]
  courseSlug: string
}

function buildHref(node: LessonRoadmapNode, courseSlug: string): string | null {
  if (!node.chapterSlug) return null
  return `/courses/${courseSlug}/chapters/${node.chapterSlug}/lessons/${node.lesson.slug}`
}

export function LessonQuickSearch({ nodes, courseSlug }: LessonQuickSearchProps) {
  const t = useTranslations('coursePage')
  const router = useRouterWithLoading()
  const inputRef = useRef<HTMLInputElement>(null)
  const { open, setOpen, query, setQuery, selectedIdx, setSelectedIdx, filtered, rootRef } =
    useLessonQuickSearchState({ nodes })

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const navigate = (node: LessonRoadmapNode) => {
    const href = buildHref(node, courseSlug)
    if (!href) return
    setOpen(false)
    router.push(href)
  }

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((idx) => (idx + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((idx) => (idx - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filtered[selectedIdx]
      if (target) navigate(target)
    }
  }

  return (
    <div ref={rootRef} className="relative flex justify-center mb-content-gap">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-content-gap-xs px-4 py-2 bg-card hover:bg-muted/50 border border-border rounded-full text-body-xs text-muted-foreground hover:text-foreground transition-all duration-normal shadow-elevation-1"
      >
        <Search className="w-4 h-4" />
        <span>{t('quickSearchTrigger')}</span>
        <kbd className="hidden md:inline text-body-2xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded ms-1">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="absolute top-12 z-50 w-full max-w-lg bg-card rounded-2xl border border-border shadow-elevation-3 overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-content-gap-xs bg-muted/30">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={t('quickSearchPlaceholder')}
              autoComplete="off"
              className="w-full text-body-sm text-foreground placeholder:text-muted-foreground bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
            />
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-section-sm text-center text-muted-foreground text-body-xs">
                {t('quickSearchNoResults')}
              </div>
            ) : (
              filtered.map((n, idx) => (
                <button
                  key={n.lesson.id}
                  type="button"
                  onMouseEnter={() => setSelectedIdx(idx)}
                  onClick={() => navigate(n)}
                  disabled={!n.chapterSlug}
                  className={cn(
                    'w-full px-3.5 py-2 flex items-center justify-between text-body-xs transition text-start',
                    idx === selectedIdx
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50',
                    !n.chapterSlug && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <div className="flex items-center gap-content-gap-xs truncate min-w-0">
                    <span className="text-body-2xs px-1.5 py-0.5 rounded border border-border shrink-0 font-mono tabular-nums">
                      {String(n.displayIndex).padStart(2, '0')}
                    </span>
                    <span className={cn('truncate', n.isFeatured && 'font-semibold text-primary')}>
                      {n.lesson.title}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

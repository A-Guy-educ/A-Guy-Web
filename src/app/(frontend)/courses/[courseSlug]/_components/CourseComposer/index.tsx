/**
 * Chat-style composer above the course tabs. Live-filters lessons on every
 * keystroke; a sentence-like request or a homework photo goes to Gemini,
 * which answers with linked lessons and a next step (Ask for homework, the
 * exams tab for test prep). PDFs go straight to Ask as before; signed-out
 * visitors are sent to log in before anything is uploaded.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import { ArrowUp, Loader2, Plus, Search, Upload, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { cn } from '@/infra/utils/ui'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import type { LessonType } from '@/server/constants/lesson-types'
import type { CourseTab } from '../CourseTabs'
import { TAB_COLORS } from '../CourseTabs'
import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'
import { BADGE_CLASSES, buildLessonHref } from './courseComposerLinks'
import { isSuggestableImage } from './courseComposerImage'
import { looksLikeSentence } from './courseComposerSuggest'
import { CourseComposerSuggestion } from './CourseComposerSuggestion'
import { useCourseComposerState } from './useCourseComposerState'
import { useCourseComposerDropToAsk } from './useCourseComposerDropToAsk'

interface CourseComposerProps {
  nodes: LessonSearchNode[]
  courseId: string
  courseSlug: string
  courseTitle: string
  activeTab: CourseTab
  onTabChange: (tab: CourseTab) => void
  isSignedIn: boolean
  ref?: Ref<CourseComposerHandle>
}

/** Lets the course guide's starting points drive the composer. */
export interface CourseComposerHandle {
  focus: () => void
  openPhotoPicker: () => void
}

const MAX_CHIPS = 3

const CHIP_TAB_TO_LESSON_TYPE: Partial<Record<CourseTab, LessonType>> = {
  learn: 'learning',
  practice: 'practice',
  exams: 'exam',
}

export function CourseComposer({
  nodes,
  courseId,
  courseSlug,
  courseTitle,
  activeTab,
  onTabChange,
  isSignedIn,
  ref,
}: CourseComposerProps) {
  const t = useTranslations('coursePage.composer')
  const tPage = useTranslations('coursePage')
  const locale = useLocale() as 'en' | 'he'
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const pathname = usePathname()
  const composer = useCourseComposerState({ nodes, courseTitle, locale, activeTab })
  const { query, setQuery, filtered, attachment, selectedIdx, setSelectedIdx } = composer

  // Uploads and Ask rooms belong to an account, so a signed-out student signs
  // in first and comes back here.
  const goToLogin = () => router.push(`/login?returnTo=${encodeURIComponent(pathname)}`)

  // Photos get lesson suggestions first; PDFs go straight to Ask.
  const handleFile = (file: File) => {
    if (!isSignedIn) goToLogin()
    else if (isSuggestableImage(file)) composer.attachPhoto(file)
    else void uploadFile(file, query)
  }

  const {
    isUploading: isDropUploading,
    isDragOver,
    dropHandlers,
    uploadFile,
    openAskWithQuestion,
  } = useCourseComposerDropToAsk({
    courseId,
    onFileDrop: handleFile,
    invalidTypeLabel: t('dropInvalidType'),
    failureLabel: t('dropFailed'),
  })

  const solveInAsk = () => {
    if (!isSignedIn) {
      goToLogin()
      return
    }
    if (attachment) void uploadFile(attachment.file, query)
    else if (query.trim()) void openAskWithQuestion(query)
  }

  // Enter/send opens the highlighted lesson for a plain topic search;
  // anything else (a sentence, a photo, no local match) asks the model now.
  const submit = () => {
    if (!attachment && filtered.length > 0 && !looksLikeSentence(query)) {
      itemRefs.current[selectedIdx]?.click()
    } else {
      void composer.send()
    }
  }

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    openPhotoPicker: () => (isSignedIn ? fileInputRef.current?.click() : goToLogin()),
  }))

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
      submit()
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

  const showResults = filtered.length > 0 && !attachment
  const showSuggestion = composer.aiLoading || composer.suggestion || composer.aiError
  const canSend = Boolean(query.trim() || attachment)

  return (
    <div className="w-full max-w-3xl mx-auto" {...dropHandlers}>
      <div
        className={cn(
          'relative bg-card border border-border rounded-3xl shadow-elevation-2 px-4 py-3 transition-colors',
          isDragOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        )}
        style={{ borderColor: query || isDragOver ? activeColor.stroke : undefined }}
      >
        {(isDragOver || isDropUploading) && (
          <div
            className="absolute inset-0 rounded-3xl bg-primary/5 flex items-center justify-center gap-content-gap-xs text-body-sm font-medium text-primary pointer-events-none"
            role="status"
            aria-live="polite"
          >
            {isDropUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('dropUploading')}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>{t('dropHint')}</span>
              </>
            )}
          </div>
        )}
        {attachment && (
          <div className="mb-2 inline-flex items-center gap-content-gap-xs rounded-xl border border-border bg-muted/60 p-1 pe-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img
              src={attachment.previewUrl}
              alt={t('photoAttached')}
              className="h-12 w-12 rounded-lg object-cover"
            />
            <span className="text-body-xs text-muted-foreground">{t('photoAttached')}</span>
            <button
              type="button"
              onClick={composer.removePhoto}
              aria-label={t('removePhoto')}
              title={t('removePhoto')}
              className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Hidden file input triggered by the `+` button below.
                Mirrors the drop target (see handleFile). */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDropUploading}
              aria-label={t('attachFile')}
              title={t('attachFile')}
              className="shrink-0 w-9 h-9 rounded-full border border-border bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center transition-colors disabled:opacity-disabled disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[28px] overflow-hidden min-w-0">
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
          </div>

          <button
            type="button"
            onClick={submit}
            aria-label={t('send')}
            disabled={!canSend}
            className={cn(
              'shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all',
              canSend
                ? 'text-white hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
            style={canSend ? { backgroundColor: activeColor.stroke } : undefined}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showResults && (
        <div className="mt-2 bg-card border border-border rounded-2xl shadow-elevation-2 overflow-hidden">
          {filtered.map((n, idx) => {
            const href = buildLessonHref(n, courseSlug)
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

      {showSuggestion && (
        <CourseComposerSuggestion
          suggestion={composer.suggestion}
          loading={composer.aiLoading}
          error={composer.aiError}
          courseSlug={courseSlug}
          accentColor={activeColor.stroke}
          hasPhoto={Boolean(attachment)}
          askBusy={isDropUploading}
          onSolveInAsk={solveInAsk}
          onOpenExams={() => onTabChange('exams')}
        />
      )}
    </div>
  )
}

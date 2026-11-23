/**
 * The demo's composer under the welcome cards. In `lessons` mode it
 * live-filters lessons on every keystroke; a sentence-like request or a photo
 * goes to Gemini, which answers with linked lessons and a next step. In
 * `homework` mode nothing is suggested: what the student writes or uploads
 * opens Ask with it. PDFs always go straight to Ask; signed-out visitors are
 * sent to log in before anything is uploaded. The mic dictates into the box,
 * as in the demo.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import { Loader2, Upload } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { toast } from 'sonner'
import { cn } from '@/infra/utils/ui'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'
import { buildLessonHref } from './courseComposerLinks'
import { isSuggestableImage } from './courseComposerImage'
import { looksLikeSentence } from './courseComposerSuggest'
import { CourseComposerSuggestion } from './CourseComposerSuggestion'
import { useCourseComposerState } from './useCourseComposerState'
import { useCourseComposerDropToAsk } from './useCourseComposerDropToAsk'
import { useDictation } from './useDictation'

interface CourseComposerProps {
  nodes: LessonSearchNode[]
  courseId: string
  courseSlug: string
  courseTitle: string
  /** The suggestion's "all exams" step opens the exams list below. */
  onOpenExams: () => void
  isSignedIn: boolean
  /** `homework` sends everything to Ask; `lessons` (default) suggests lessons. */
  mode?: 'lessons' | 'homework'
  placeholder?: string
  ref?: Ref<CourseComposerHandle>
}

/** Lets the finder's camera / upload buttons drive the composer. */
export interface CourseComposerHandle {
  focus: () => void
  openCamera: () => void
  openFilePicker: () => void
}

/** The demo's pink, for the AI reply's accents. */
const ACCENT = 'hsl(var(--pl-action))'

export function CourseComposer({
  nodes,
  courseId,
  courseSlug,
  courseTitle,
  onOpenExams,
  isSignedIn,
  mode = 'lessons',
  placeholder,
  ref,
}: CourseComposerProps) {
  const t = useTranslations('coursePage.composer')
  const tPage = useTranslations('coursePage')
  const locale = useLocale() as 'en' | 'he'
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const isHomework = mode === 'homework'

  const router = useRouter()
  const pathname = usePathname()
  const composer = useCourseComposerState({
    nodes,
    courseTitle,
    locale,
    suggest: !isHomework,
  })
  const { query, setQuery, filtered, attachment, selectedIdx, setSelectedIdx } = composer

  // Uploads and Ask rooms belong to an account, so a signed-out student signs
  // in first and comes back here.
  const goToLogin = () => router.push(`/login?returnTo=${encodeURIComponent(pathname)}`)

  // Photos get lesson suggestions first; PDFs, and anything for homework,
  // go straight to Ask (with whatever the student already typed).
  const handleFile = (file: File) => {
    if (!isSignedIn) goToLogin()
    else if (!isHomework && isSuggestableImage(file)) composer.attachPhoto(file)
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

  const canSend = Boolean(query.trim() || attachment)

  // Enter/send opens the highlighted lesson for a plain topic search;
  // anything else (a sentence, a photo, no local match) asks the model now.
  const submit = () => {
    if (!canSend) return
    if (isHomework) {
      solveInAsk()
      return
    }
    if (!attachment && filtered.length > 0 && !looksLikeSentence(query)) {
      itemRefs.current[selectedIdx]?.click()
    } else {
      void composer.send()
    }
  }

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    openCamera: () => (isSignedIn ? cameraInputRef.current?.click() : goToLogin()),
    openFilePicker: () => (isSignedIn ? fileInputRef.current?.click() : goToLogin()),
  }))

  const dictation = useDictation({
    locale,
    onText: (text) => {
      setQuery(text)
      textareaRef.current?.focus()
    },
    onUnavailable: () => toast(t('micUnavailable')),
    onFailed: () => toast(t('micFailed')),
  })

  // Auto-grow the textarea to fit content, up to the demo's 100px.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`
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

  const showResults = !isHomework && filtered.length > 0 && !attachment
  const showSuggestion =
    !isHomework && (composer.aiLoading || composer.suggestion || composer.aiError)
  const placeholderText = placeholder ?? t('placeholder')

  return (
    <div className="composer-wrap" {...dropHandlers}>
      <form
        className={cn('composer', isDragOver && 'drag-over')}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {(isDragOver || isDropUploading) && (
          <div className="composer-status" role="status" aria-live="polite">
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
          <div className="attachment">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={attachment.previewUrl} alt="" />
            <span>{t('photoAttached')}</span>
            <button
              type="button"
              onClick={composer.removePhoto}
              aria-label={t('removePhoto')}
              title={t('removePhoto')}
            >
              ✕
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={placeholderText}
          placeholder={placeholderText}
        />
        {/* Hidden file input behind the `+` button; mirrors the drop target (see handleFile). */}
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
        <input
          ref={cameraInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
        <div className="tools">
          <div className="tools-group">
            <button
              type="button"
              className="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDropUploading}
              aria-label={t('attachFile')}
              title={t('attachFile')}
            >
              <svg viewBox="0 0 24 24" className="pl-icon">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              type="button"
              className={cn('icon', dictation.listening && 'talking')}
              onClick={dictation.toggle}
              aria-label={t('mic')}
              title={t('mic')}
            >
              <svg viewBox="0 0 24 24" className="pl-icon">
                <rect x="9" y="2" width="6" height="13" rx="3" />
                <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
              </svg>
            </button>
          </div>
          <button type="submit" className="icon send" aria-label={t('send')} title={t('send')}>
            <svg viewBox="0 0 24 24" className="pl-icon">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </button>
        </div>
      </form>

      {showResults && (
        <div className="composer-results">
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
                className={cn('topic-btn', idx === selectedIdx && 'selected')}
              >
                <span className="truncate">{n.lesson.title}</span>
                <span className="topic-count">{tPage(`quickSearchType.${n.lessonType}`)}</span>
              </SystemLink>
            )
          })}
        </div>
      )}

      {showSuggestion && (
        <div className="composer-suggestion">
          <CourseComposerSuggestion
            suggestion={composer.suggestion}
            loading={composer.aiLoading}
            error={composer.aiError}
            courseSlug={courseSlug}
            accentColor={ACCENT}
            hasPhoto={Boolean(attachment)}
            askBusy={isDropUploading}
            onSolveInAsk={solveInAsk}
            onOpenExams={onOpenExams}
          />
        </div>
      )}
    </div>
  )
}

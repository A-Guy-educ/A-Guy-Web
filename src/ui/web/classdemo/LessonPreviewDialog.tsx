'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

import { LESSON_TYPE_LABEL } from './classDemoLessons'
import type { DemoLesson } from './classDemoLessons'
import { btn, eyebrow } from './classDemoStyles'

interface LessonPreviewDialogProps {
  lesson: DemoLesson
  done: boolean
  onClose: () => void
  onComplete: () => void
}

export function LessonPreviewDialog({
  lesson,
  done,
  onClose,
  onComplete,
}: LessonPreviewDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-modal grid place-items-center bg-nc-ink/55 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-lesson-title"
        className="w-full max-w-[440px] rounded-[20px] bg-nc-paper p-7 text-nc-ink shadow-modal"
      >
        <div className="flex items-center justify-between gap-content-gap-xs.5">
          <span className={eyebrow}>תצוגת שיעור לדוגמה</span>
          <button type="button" className={btn.ghostSm} aria-label="סגירה" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <h3 id="cd-lesson-title" className="my-3 text-[22px] font-bold">
          {lesson.title}
        </h3>
        <div className="flex flex-wrap items-center gap-content-gap-xs.5 text-[11px] text-nc-ink-soft">
          <b className="font-bold text-nc-ink-2">{LESSON_TYPE_LABEL[lesson.type]}</b>
          <span>·</span>
          <span>{lesson.minutes} דקות</span>
        </div>
        <p className="text-body-sm leading-[1.8] text-nc-ink-2">{lesson.description}</p>
        <p className="text-body-sm leading-[1.8] text-nc-ink-2">
          בדמו זה מוצג מסך תצוגה מקדימה. במערכת המלאה לחיצה על שיעור תפתח את שיעור Aguy עצמו.
        </p>
        <div className="mt-6 flex justify-end gap-content-gap-xs">
          <button type="button" className={btn.outline} onClick={onClose}>
            חזרה
          </button>
          <button
            type="button"
            className={done ? btn.outline : btn.primary}
            disabled={done}
            onClick={onComplete}
          >
            {done ? 'סומן כהושלם ✓' : 'סימון כהושלם (דמו)'}
          </button>
        </div>
      </section>
    </div>
  )
}

'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { btn } from '../newclassStyles'
import { ContactForm } from './ContactForm'
import type { ContactTopic } from './contactOptions'

interface ContactDialogProps {
  initialTopic: ContactTopic
  onClose: () => void
}

export function ContactDialog({ initialTopic, onClose }: ContactDialogProps) {
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-nc-ink/55 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nc-dlg-title"
        className="flex max-h-[90vh] w-full max-w-[520px] flex-col gap-5 overflow-y-auto rounded-3xl bg-nc-paper p-8 text-nc-ink shadow-modal"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="nc-dlg-title" className="font-nc-display text-[26px] font-extrabold">
            בואו נדבר
          </h2>
          <button
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-nc-mock-bar"
          >
            <X className="size-[18px] text-nc-ink" aria-hidden="true" />
          </button>
        </div>
        {sent ? (
          <div className="flex flex-col gap-3 py-3">
            <strong className="text-xl text-nc-class-deep">תודה!</strong>
            <span className="text-nc-ink-2">
              זו גרסת תצוגה של האתר, והטופס עדיין לא מחובר. בגרסה הסופית הפרטים יגיעו אלינו ונחזור
              אליכם.
            </span>
            <button type="button" className={`${btn.brand} self-start`} onClick={onClose}>
              סגירה
            </button>
          </div>
        ) : (
          <ContactForm initialTopic={initialTopic} onSubmitted={() => setSent(true)} />
        )}
      </div>
    </div>
  )
}

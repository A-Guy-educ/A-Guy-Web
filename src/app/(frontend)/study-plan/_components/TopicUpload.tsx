'use client'

/**
 * The demo's "צילום רשימה או העלאת מסמך" at the top of the plan's topics: the
 * teacher's topic list as a photo (the phone offers its camera) or a PDF.
 * The panel reads it and adds the topics, matched to the course's lessons.
 */
import { FileUp, Loader2 } from 'lucide-react'
import { useRef } from 'react'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'

interface TopicUploadProps {
  busy: boolean
  onFile: (file: File) => void
}

export function TopicUpload({ busy, onFile }: TopicUploadProps) {
  const t = useTranslations('studyPlan')
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'w-full flex items-center justify-center gap-content-gap-xs px-3 py-3 mb-1',
          'text-body-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10',
          'rounded-lg border border-dashed border-primary/40 transition-colors duration-normal',
          'disabled:opacity-60 disabled:cursor-wait',
        )}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileUp className="w-4 h-4" aria-hidden="true" />
        )}
        {busy ? t('uploadReading') : t('uploadList')}
      </button>
      <p className="text-body-xs text-muted-foreground mb-3">{t('uploadHint')}</p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        aria-label={t('uploadList')}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </>
  )
}

'use client'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

interface DoodleTextAreaProps {
  className?: string
}

export function DoodleTextArea({ className }: DoodleTextAreaProps) {
  const t = useTranslations('courses.doodleNotebook')
  const [text, setText] = useState('')

  return (
    <div className={cn('flex flex-col min-h-0 h-full', className)}>
      <div className="flex items-center justify-end gap-content-gap-xs px-3 py-2 border-b border-border/60 bg-muted/40 shrink-0">
        <button
          type="button"
          onClick={() => setText('')}
          disabled={text.length === 0}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-body-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-normal disabled:opacity-40 disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t('clear')}</span>
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('textPlaceholder')}
        spellCheck={false}
        className="flex-1 min-h-0 w-full resize-none bg-background p-3 text-body-sm leading-relaxed outline-none focus-visible:outline-none placeholder:text-muted-foreground/80 placeholder:whitespace-pre-line"
      />
    </div>
  )
}

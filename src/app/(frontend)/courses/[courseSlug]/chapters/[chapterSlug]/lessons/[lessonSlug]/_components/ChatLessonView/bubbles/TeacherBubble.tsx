'use client'

import { cn } from '@/infra/utils/ui'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'
import { Sparkles, Volume2, VolumeX } from 'lucide-react'
import type { ReactNode } from 'react'

interface TeacherBubbleProps {
  /** Teacher line rendered as MathMarkdown. Omit for bubbles whose whole
   *  content lives in `children`. */
  text?: string
  variant?: 'default' | 'correction' | 'feedback'
  onSpeak?: () => void
  speaking?: boolean
  muted?: boolean
  ttsSupported?: boolean
  children?: ReactNode
}

export function TeacherBubble({
  text,
  variant = 'default',
  onSpeak,
  speaking,
  muted,
  ttsSupported,
  children,
}: TeacherBubbleProps) {
  const isCorrection = variant === 'correction'
  const hasText = typeof text === 'string' && text.trim().length > 0
  return (
    <div className="flex items-start gap-content-gap-xs">
      {/* External avatar — brand circle with sparkles, matches mockup */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-elevation-1 mt-0.5',
          isCorrection
            ? 'bg-warning text-warning-foreground'
            : 'bg-primary text-primary-foreground',
        )}
        aria-hidden="true"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </div>

      <div
        className={cn(
          'flex-1 min-w-0 rounded-2xl rounded-tr-md p-card-padding-sm md:p-5 shadow-elevation-1 border',
          isCorrection ? 'bg-warning/10 border-warning/30' : 'bg-card border-border',
        )}
      >
        {isCorrection && (
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-body-xs font-semibold text-warning">
              הסבר ותיקון
            </span>
            {ttsSupported && onSpeak && (
              <TtsToggle onSpeak={onSpeak} speaking={speaking} muted={muted} tone="warning" />
            )}
          </div>
        )}

        {hasText && (
          <div className="text-body-md font-medium text-foreground leading-relaxed">
            <MathMarkdown content={text!} />
          </div>
        )}

        {children ? <div className={hasText ? 'mt-3' : undefined}>{children}</div> : null}

        {!isCorrection && ttsSupported && onSpeak && (hasText || children) && (
          <div className="mt-2 flex justify-end">
            <TtsToggle onSpeak={onSpeak} speaking={speaking} muted={muted} tone="primary" />
          </div>
        )}
      </div>
    </div>
  )
}

function TtsToggle({
  onSpeak,
  speaking,
  muted,
  tone,
}: {
  onSpeak: () => void
  speaking?: boolean
  muted?: boolean
  tone: 'primary' | 'warning'
}) {
  return (
    <button
      type="button"
      onClick={onSpeak}
      className={cn(
        'p-1.5 rounded-full transition-colors',
        muted
          ? 'text-muted-foreground'
          : tone === 'warning'
            ? 'text-warning hover:bg-warning/10'
            : 'text-primary hover:bg-primary/10',
      )}
      aria-label={muted ? 'השמעה מושתקת' : speaking ? 'מדבר…' : 'השמע'}
    >
      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  )
}

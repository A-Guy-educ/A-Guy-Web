'use client'

import { cn } from '@/infra/utils/ui'
import type { MasteryLevel, TopicInput } from '@/server/services/study-plan'
import { useTranslations } from '@/ui/web/providers/I18n'
import { Trash2 } from 'lucide-react'

const MASTERY_COLORS = {
  weak: 'bg-error/10 text-error border-error/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  strong: 'bg-success/10 text-success border-success/20',
}

interface TopicRowProps {
  topic: TopicInput
  onMasteryChange: (mastery: MasteryLevel) => void
  onDelete: () => void
}

/** A plan topic: its name, the lessons it was matched to, and the student's rating. */
export function TopicRow({ topic, onMasteryChange, onDelete }: TopicRowProps) {
  const t = useTranslations('studyPlan')
  const matched = [
    topic.learningRef && `${t('lessonKind.learning')}: ${topic.learningRef.lessonTitle}`,
    topic.practiceRef && `${t('lessonKind.practice')}: ${topic.practiceRef.lessonTitle}`,
  ].filter(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-content-gap-xs p-3 bg-card rounded-lg border border-border transition-colors duration-normal">
      {/* min-w-32: on a phone the ratings wrap below the name instead of squeezing it */}
      <div className="flex-1 min-w-32">
        <span className="text-body-sm font-medium text-foreground truncate block">
          {topic.topicLabel}
        </span>
        {matched.length > 0 && (
          <span className="text-body-xs text-muted-foreground truncate block">
            {matched.join(' · ')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {(['weak', 'medium', 'strong'] as MasteryLevel[]).map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={topic.mastery === level}
            onClick={() => onMasteryChange(level)}
            className={cn(
              'px-2 py-1 text-body-xs font-medium rounded-md border transition-colors duration-normal',
              topic.mastery === level
                ? MASTERY_COLORS[level]
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted',
            )}
          >
            {t(`mastery.${level}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('removeTopic')}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-all duration-normal hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

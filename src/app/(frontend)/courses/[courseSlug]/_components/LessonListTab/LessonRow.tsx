/**
 * @fileType component
 * @domain frontend
 * @pattern lesson-roadmap-card
 * @ai-summary Compact lesson card for the 3-per-row chapter grid. Renders a numbered badge, title with status/percent meta, and a right-aligned action chip (Continue / Start / Learn now / Locked / Coming soon). Replaces the earlier full-width row layout to match the home-page demo. Still wrapped in a SystemLink so route-loading state registers on navigation; paywall-locked variants route to the resolved purchase URL instead.
 */

'use client'

import { CheckCircle2, Clock, Lock, Play } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/infra/utils/ui'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { storeLessonOpenTimestamp } from '@/infra/analytics/utils/lesson-load-timing'
import { SYSTEM_EVENTS, systemEventBus } from '@/infra/system-events'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { LessonRoadmapNode } from './lessonRoadmapTypes'

interface LessonRowProps {
  node: LessonRoadmapNode
  courseSlug: string
  purchaseHref?: string
}

function formatIndex(n: number): string {
  return String(n).padStart(2, '0')
}

export function LessonRow({ node, courseSlug, purchaseHref }: LessonRowProps) {
  const t = useTranslations('coursePage')
  const tc = useTranslations('courses')
  const { lesson, chapterSlug, displayIndex, status } = node

  const href = chapterSlug
    ? `/courses/${courseSlug}/chapters/${chapterSlug}/lessons/${lesson.slug}`
    : '#'
  // Tier-locked rows route to the subscription store (plan upgrade); legacy
  // per-course paywalls stay on the resolved per-course purchase URL.
  const buyHref = node.isTierLocked ? '/subscriptions' : (purchaseHref ?? '/products')

  const isInteractive = status !== 'soon' && status !== 'locked'
  const targetHref = status === 'soon' ? '#' : status === 'locked' ? buyHref : href

  const handleClick = (e: React.MouseEvent) => {
    if (status === 'soon') {
      e.preventDefault()
      toast.info(tc('contentLocked'))
      return
    }
    if (status === 'locked') return
    if (!chapterSlug) {
      e.preventDefault()
      return
    }
    storeLessonOpenTimestamp(lesson.id)
    systemEventBus.emit(SYSTEM_EVENTS.LESSON_OPEN_ATTEMPTED, {
      lesson_id: lesson.id,
      content_type: (lesson.contentFiles?.length ?? 0) > 0 ? 'pdf' : 'exercises',
      platform: 'web',
      course_id: courseSlug,
    })
  }

  const isActiveTone = node.isFeatured || status === 'active'

  const cardTone =
    status === 'completed'
      ? 'border-success/20 bg-success/[0.03] hover:border-success/40'
      : isActiveTone
        ? 'border-primary/50 bg-primary/[0.04] ring-1 ring-primary/20'
        : status === 'locked'
          ? 'border-warning/30 bg-warning/[0.05] hover:border-warning/40'
          : status === 'soon'
            ? 'border-border/60 bg-muted/20 opacity-70'
            : // Not-yet-started: inviting primary-tinted card instead of gray.
              'border-primary/20 bg-primary/[0.015] hover:border-primary/40'

  const numberTone =
    status === 'completed'
      ? 'bg-success/10 text-success'
      : isActiveTone
        ? 'bg-primary/15 text-primary'
        : status === 'locked'
          ? 'bg-warning/10 text-warning'
          : status === 'soon'
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary/10 text-primary'

  return (
    <SystemLink
      href={targetHref}
      onClick={handleClick}
      data-testid="course-lesson-row"
      data-lesson-id={lesson.id}
      data-lesson-status={status}
      className={cn(
        'group flex items-center gap-content-gap-xs rounded-xl border p-3 sm:p-card-padding-sm min-h-[60px]',
        'transition-all duration-normal',
        cardTone,
        isInteractive && 'hover:-translate-y-0.5 hover:shadow-elevation-1',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-8 h-9 rounded-lg font-bold text-body-sm shrink-0 tabular-nums',
          numberTone,
        )}
      >
        {formatIndex(displayIndex)}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="text-body-sm font-bold text-foreground tracking-tight leading-tight break-words">
          {lesson.title}
        </h4>
        <LessonMeta node={node} t={t} />
      </div>

      {renderStatusControl({ node, t })}
    </SystemLink>
  )
}

function LessonMeta({
  node,
  t,
}: {
  node: LessonRoadmapNode
  t: ReturnType<typeof useTranslations>
}) {
  const { status, progressPercent } = node
  if (status === 'active') {
    return (
      <div className="flex items-center gap-1 text-body-2xs text-primary mt-1">
        <span className="font-semibold">{t('roadmapStatusInProgress')}</span>
        <span className="text-muted-foreground">·</span>
        <span className="tabular-nums text-muted-foreground">{progressPercent}%</span>
      </div>
    )
  }
  if (status === 'completed') {
    return (
      <div className="flex items-center gap-1 text-body-2xs text-success mt-1">
        <span className="font-semibold">{t('roadmapLessonCompleted')}</span>
        <span className="text-muted-foreground">·</span>
        <span className="tabular-nums text-muted-foreground">100%</span>
      </div>
    )
  }
  if (status === 'available') {
    return (
      <div className="text-body-2xs text-muted-foreground mt-1">{t('roadmapStatusNotStarted')}</div>
    )
  }
  return null
}

function renderStatusControl({
  node,
  t,
}: {
  node: LessonRoadmapNode
  t: ReturnType<typeof useTranslations>
}) {
  const { status, isFeatured } = node
  if (status === 'completed') {
    return (
      <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-muted px-3 h-9 text-body-xs font-bold text-foreground">
        <CheckCircle2 className="w-3.5 h-3.5 text-success me-1" />
        {t('roadmapLessonOpen')}
      </span>
    )
  }
  if (status === 'locked') {
    return (
      <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-warning/10 px-3 h-9 text-body-xs font-bold text-warning">
        <Lock className="w-3 h-3 me-1" />
        {t('roadmapLessonLocked')}
      </span>
    )
  }
  if (status === 'soon') {
    return (
      <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-muted px-3 h-9 text-body-xs font-medium text-muted-foreground">
        <Clock className="w-3 h-3 me-1" />
        {t('roadmapLessonComingSoon')}
      </span>
    )
  }
  const label =
    status === 'active'
      ? t('roadmapLessonContinue')
      : isFeatured
        ? t('roadmapLessonLearnNow')
        : t('roadmapLessonStart')
  return (
    <span
      className={cn(
        'shrink-0 inline-flex items-center justify-center rounded-lg px-3 h-9 text-body-xs font-bold',
        'transition-colors duration-normal',
        isFeatured || status === 'active'
          ? 'bg-primary text-primary-foreground shadow-elevation-1'
          : 'bg-primary/10 text-primary border border-primary/30 group-hover:bg-primary/20',
      )}
    >
      <Play className="w-2.5 h-2.5 me-1" />
      {label}
    </span>
  )
}

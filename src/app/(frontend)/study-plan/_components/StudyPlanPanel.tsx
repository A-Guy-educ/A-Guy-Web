'use client'

/**
 * The study plan itself — exam date, topics with self-rated mastery, and the
 * generated days — without page chrome. `/study-plan` wraps it in its page;
 * the course page's exam hub shows it `stacked` inside "my prep plan", with
 * its `course`: there the exam date starts from the course's, the teacher's
 * topic list can be uploaded, and every topic (uploaded or typed) is matched
 * to the course's lessons, which the days then link to by the student's
 * rating (see planLessons).
 */
import { cn } from '@/infra/utils/ui'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import { Calendar, ChevronDown, ChevronRight, Loader2, Plus, Zap } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { addExamDate, getExamDates, setExamDates } from '@/client/state/localStorage/examDates'
import { getUserProfile } from '@/client/state/localStorage/userProfile'
import type { LessonRef, MasteryLevel, TopicInput } from '@/server/services/study-plan'
import { Button } from '@/ui/web/components/button'
import { DayCard } from './DayCard'
import { EmptyPlanState } from './EmptyPlanState'
import { LessonSelector } from './LessonSelector'
import { firstDayByTopic, type PlanCourse } from './planLessons'
import { TopicRow } from './TopicRow'
import { TopicUpload } from './TopicUpload'
import { TopicMatchFailure, useExamTopicMatching } from './useExamTopicMatching'
import { useStudyPlan } from './useStudyPlan'

interface StudyPlanPanelProps {
  /** One column whatever the viewport (for narrow containers). */
  stacked?: boolean
  /** The course the plan is built in: enables the upload and lesson matching. */
  course?: PlanCourse
}

/** The nearest exam date still ahead, from the saved exam dates. */
function upcomingExamDate(key: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return (
    getExamDates(key)
      .map((exam) => exam.date)
      .filter((date) => date >= today)
      .sort()[0] ?? ''
  )
}

export function StudyPlanPanel({ stacked = false, course }: StudyPlanPanelProps) {
  const t = useTranslations('studyPlan')
  const locale = useLocale() === 'en' ? 'en' : 'he'
  const { plan, isLoading, generatePlan, toggleDayStatus, editDay } = useStudyPlan()
  const { match, isMatching } = useExamTopicMatching(course, locale)
  // The course page counts down to the course's exam; /study-plan keeps its own.
  const examDatesKey = course?.id ?? 'default-course'

  const gradeLevel = getUserProfile()?.gradeLevel || 'default'

  const pendingRegeneration = useRef(false)
  const [examDate, setExamDate] = useState('')
  const [topics, setTopics] = useState<TopicInput[]>([])
  const [newTopic, setNewTopic] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)
  const [showCourseSelector, setShowCourseSelector] = useState(false)
  const [matchNote, setMatchNote] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)

  // Load sidebar fields from saved plan and show schedule if plan was loaded from DB
  useEffect(() => {
    if (plan) {
      setExamDate(plan.examDate)
      setTopics(plan.topics)
      setHasGenerated(true)
    }
  }, [plan])

  // No plan yet: start from the exam date onboarding (or the countdown) saved.
  useEffect(() => {
    if (!isLoading && !plan) setExamDate((current) => current || upcomingExamDate(examDatesKey))
  }, [isLoading, plan, examDatesKey])

  const addTopics = useCallback((added: TopicInput[]) => {
    pendingRegeneration.current = true
    setTopics((prev) => {
      const labels = new Set(prev.map((topic) => topic.topicLabel))
      return [...prev, ...added.filter((topic) => !labels.has(topic.topicLabel))]
    })
  }, [])

  // In a course, a typed topic is matched to its lessons too; if that fails
  // it is still added, just without links.
  const handleAddTopic = useCallback(async () => {
    const label = newTopic.trim()
    if (!label || isMatching) return
    setNewTopic('')
    const plain: TopicInput = {
      topicId: `topic-${Date.now()}`,
      topicLabel: label,
      mastery: course ? 'medium' : 'weak',
    }
    if (!course) {
      addTopics([plain])
      return
    }
    const matched = await match({ text: label }).catch(() => [])
    addTopics(matched.length > 0 ? matched : [plain])
  }, [newTopic, isMatching, course, match, addTopics])

  const handleUploadFile = useCallback(
    async (file: File) => {
      setMatchNote(null)
      try {
        const matched = await match({ file })
        if (matched.length === 0) {
          setMatchNote({ tone: 'error', text: t('uploadNone') })
          return
        }
        addTopics(matched)
        setMatchNote({
          tone: 'info',
          text: t('uploadAdded').replace('{count}', String(matched.length)),
        })
      } catch (error) {
        const reason = error instanceof TopicMatchFailure ? error.reason : 'failed'
        const key =
          reason === 'tooLarge'
            ? 'uploadTooLarge'
            : reason === 'unsupported'
              ? 'uploadUnsupported'
              : 'uploadFailed'
        setMatchNote({ tone: 'error', text: t(key) })
      }
    },
    [match, addTopics, t],
  )

  const handleRemoveTopic = useCallback((topicId: string) => {
    pendingRegeneration.current = true
    setTopics((prev) => prev.filter((t) => t.topicId !== topicId))
  }, [])

  const handleMasteryChange = useCallback((topicId: string, mastery: MasteryLevel) => {
    pendingRegeneration.current = true
    setTopics((prev) => prev.map((t) => (t.topicId === topicId ? { ...t, mastery } : t)))
  }, [])

  const handleAddLessonsFromCourse = useCallback((lessonRefs: LessonRef[]) => {
    pendingRegeneration.current = true
    const newTopics: TopicInput[] = lessonRefs.map((ref) => ({
      topicId: `topic-${ref.lessonId}-${Date.now()}`,
      topicLabel: ref.lessonTitle,
      mastery: 'weak' as MasteryLevel,
      lessonRef: ref,
    }))
    setTopics((prev) => [...prev, ...newTopics])
  }, [])

  const handleMarkComplete = useCallback(
    async (dayId: string) => {
      await toggleDayStatus(dayId)
    },
    [toggleDayStatus],
  )

  const handleGeneratePlan = useCallback(async () => {
    if (!examDate || topics.length === 0) return
    await generatePlan(examDate, topics, 'default-course')
    // Persist exam date to localStorage so the /study countdown can read it
    const existing = getExamDates(examDatesKey)
    if (!existing.some((e) => e.date === examDate)) {
      addExamDate(examDatesKey, { id: `exam-${Date.now()}`, date: examDate })
    } else {
      // Update: keep only the latest exam date
      setExamDates(examDatesKey, [{ id: existing[0]?.id ?? `exam-${Date.now()}`, date: examDate }])
    }
    setHasGenerated(true)
  }, [examDate, topics, generatePlan, examDatesKey])

  // Auto-regenerate plan only after initial explicit generation
  useEffect(() => {
    if (!hasGenerated) return
    if (!pendingRegeneration.current) return
    if (examDate && topics.length > 0) {
      const timer = setTimeout(() => {
        pendingRegeneration.current = false
        generatePlan(examDate, topics, 'default-course')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [examDate, topics, generatePlan, hasGenerated])

  const firstDays = useMemo(() => firstDayByTopic(plan?.days ?? []), [plan])

  if (isLoading && !hasGenerated) {
    return (
      <div className="flex items-center justify-center py-section-md">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 gap-content-gap', !stacked && 'lg:grid-cols-3')}>
      {/* Sidebar */}
      <div className={cn('space-y-content-gap', !stacked && 'lg:col-span-1')}>
        {/* Exam Date Card */}
        <div className="bg-card rounded-2xl border border-border p-card-padding shadow-elevation-1">
          <div className="flex items-center gap-content-gap-xs mb-4">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-heading-lg font-semibold text-foreground">{t('examDate')}</h2>
          </div>
          <input
            type="date"
            // iOS writes the value as "30 Nov 2026": in an RTL box it reorders to
            // "Nov 2026 30", and its built-in min width pushes the box out of the
            // card. LTR text kept right-aligned, and no native look / min width.
            dir="ltr"
            value={examDate}
            onChange={(e) => {
              pendingRegeneration.current = true
              setExamDate(e.target.value)
            }}
            className="block w-full min-w-0 min-h-11 appearance-none rtl:text-right [&::-webkit-date-and-time-value]:[text-align:inherit] px-4 py-2.5 border border-border rounded-lg text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        {/* Topics Card */}
        <div className="bg-card rounded-2xl border border-border p-card-padding shadow-elevation-1">
          <h2 className="text-heading-lg font-semibold text-foreground mb-4">{t('topicsTitle')}</h2>

          {course && <TopicUpload busy={isMatching} onFile={handleUploadFile} />}
          {matchNote && (
            // Plain classes: cn() would drop the custom text-body-xs as clashing with the color.
            <p
              role="status"
              className={`text-body-xs mb-3 ${matchNote.tone === 'error' ? 'text-error' : 'text-muted-foreground'}`}
            >
              {matchNote.text}
            </p>
          )}

          {/* Select from Course toggle — in a course, topics are matched to it instead */}
          {!course && (
            <button
              type="button"
              onClick={() => setShowCourseSelector((prev) => !prev)}
              className="w-full flex items-center gap-content-gap-xs px-3 py-2 mb-3 text-body-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 transition-colors duration-normal"
            >
              {showCourseSelector ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              {t('selectFromCourse')}
            </button>
          )}

          {/* Course lesson selector */}
          {!course && showCourseSelector && (
            <div className="mb-4">
              <p className="text-body-xs text-muted-foreground mb-2">{t('selectLessonsHint')}</p>
              <LessonSelector gradeLevel={gradeLevel} onAddLessons={handleAddLessonsFromCourse} />
            </div>
          )}

          {course && topics.length > 0 && (
            <p className="text-body-xs text-muted-foreground mb-2">{t('levelHint')}</p>
          )}
          <div className="space-y-2 mb-4">
            {topics.map((topic) => (
              <TopicRow
                key={topic.topicId}
                topic={topic}
                onMasteryChange={(mastery) => handleMasteryChange(topic.topicId, mastery)}
                onDelete={() => handleRemoveTopic(topic.topicId)}
              />
            ))}
          </div>

          <div className="flex gap-content-gap-xs">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleAddTopic()}
              placeholder={t('addTopicPlaceholder')}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-foreground bg-card text-body-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => void handleAddTopic()}
              disabled={isMatching}
              aria-label={t('addTopic')}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-foreground text-background transition-all duration-normal hover:bg-foreground/90 disabled:opacity-60"
            >
              {isMatching ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Generate Plan Button */}
        <Button
          onClick={handleGeneratePlan}
          disabled={!examDate || topics.length === 0 || isLoading}
          size="lg"
          className="w-full"
        >
          <Zap className="w-5 h-5 me-2" />
          {t('generateButton')}
        </Button>
      </div>

      {/* Main Content */}
      <div className={cn(!stacked && 'lg:col-span-2')}>
        {isLoading && hasGenerated ? (
          <div className="flex flex-col items-center justify-center py-section-md px-4 border-2 border-dashed border-border rounded-2xl">
            <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        ) : hasGenerated && plan ? (
          <div>
            <div className="mb-4">
              <h2 className="text-heading-lg font-semibold text-foreground">
                {t('scheduleTitle')}
              </h2>
              <p className="text-body-sm text-muted-foreground">{t('scheduleSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-content-gap">
              {plan.days.map((day) => (
                <DayCard
                  key={day.dayId}
                  day={day}
                  topics={topics}
                  firstDayByTopic={firstDays}
                  onToggleStatus={() => handleMarkComplete(day.dayId)}
                  onEdit={(edits) => editDay(day.dayId, edits)}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyPlanState />
        )}
      </div>
    </div>
  )
}

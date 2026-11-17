import { ArrowLeft } from 'lucide-react'
import type { Dispatch } from 'react'

import { LESSON_TYPE_LABEL, publishedLessons } from './classDemoLessons'
import type { DemoLesson } from './classDemoLessons'
import { btn, panel } from './classDemoStyles'
import type { ClassDemoAction, ClassDemoState } from './classDemoState'
import { EmptyState } from './WorkspaceChrome'

interface StudentDashboardProps {
  state: ClassDemoState
  dispatch: Dispatch<ClassDemoAction>
}

export function StudentDashboard({ state, dispatch }: StudentDashboardProps) {
  const lessons = publishedLessons(state.published)
  const finished = lessons.filter((l) => state.done.includes(l.id)).length
  const next = lessons.find((l) => !state.done.includes(l.id))
  const pct = lessons.length ? Math.round((finished / lessons.length) * 100) : 0
  const showContent = () => dispatch({ type: 'showContent', screen: 'student' })

  const heading = next
    ? next.title
    : lessons.length
      ? 'כל השיעורים הושלמו!'
      : 'עדיין אין שיעורים פתוחים'
  const body = next
    ? 'המורה פתח לך שיעור. אפשר להתכונן כבר עכשיו.'
    : lessons.length
      ? 'עבודה יפה! אפשר לחזור לתרגול בכל שלב.'
      : 'כשהמורה יפתח שיעורים הם יופיעו כאן.'

  return (
    <>
      <div className="relative mb-5 flex items-center justify-between gap-5 overflow-hidden rounded-[20px] bg-nc-ink p-5 text-white sm:p-7">
        <div className="relative z-[1]">
          <span className="text-body-xs font-extrabold text-nc-brand-light">
            {next ? 'השיעור הבא שלך' : 'ההתקדמות שלי'}
          </span>
          <h3 className="my-2.5 text-body-lg leading-[1.45] font-bold sm:text-[22px]">{heading}</h3>
          <p className="mt-0 mb-4 text-body-xs text-white/70">{body}</p>
          {next ? (
            <button
              type="button"
              className={btn.primary}
              onClick={() => dispatch({ type: 'openLesson', id: next.id })}
            >
              התחלת שיעור <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className={btn.outline} onClick={showContent}>
              לצפייה בתוכן
            </button>
          )}
        </div>
        <div
          className="relative grid size-[91px] flex-none place-items-center rounded-full sm:size-[116px]"
          style={{
            background: `conic-gradient(hsl(var(--nc-brand-light)) ${pct * 3.6}deg, hsl(0 0% 100% / 0.15) 0)`,
          }}
        >
          <div className="absolute inset-2.5 rounded-full bg-nc-ink" />
          <div className="relative text-center">
            <strong className="block text-[21px] sm:text-[25px]">{pct}%</strong>
            <span className="text-[10px] text-white/70">הושלם</span>
          </div>
        </div>
      </div>
      <div className="mb-5 flex items-start justify-between gap-content-gap sm:items-center">
        <div>
          <h3 className="mt-0 mb-1 text-heading-xl font-bold sm:text-[23px]">השיעורים שלי</h3>
          <p className="m-0 text-[13px] text-nc-ink-2">נבחרו עבורך על ידי המורה.</p>
        </div>
        <button type="button" className={btn.outlineSm} onClick={showContent}>
          לכל השיעורים
        </button>
      </div>
      {lessons.length ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.slice(0, 3).map((lesson) => (
            <StudentLessonCard
              key={lesson.id}
              lesson={lesson}
              done={state.done.includes(lesson.id)}
              onOpen={() => dispatch({ type: 'openLesson', id: lesson.id })}
            />
          ))}
        </div>
      ) : (
        <div className={panel}>
          <EmptyState>כרגע אין שיעורים שהמורה פתח לכיתה.</EmptyState>
        </div>
      )}
    </>
  )
}

interface StudentLessonCardProps {
  lesson: DemoLesson
  done: boolean
  onOpen: () => void
}

function StudentLessonCard({ lesson, done, onOpen }: StudentLessonCardProps) {
  return (
    <div className={`${panel} flex flex-col gap-3 p-5 sm:min-h-48`}>
      <div className="flex flex-wrap items-center gap-[10px] text-[11px] text-nc-ink-soft">
        <b className="font-bold text-nc-ink-2">{LESSON_TYPE_LABEL[lesson.type]}</b>
        <span>· {lesson.minutes} דקות</span>
      </div>
      <h4 className="m-0 text-body-sm leading-[1.6] font-bold">{lesson.title}</h4>
      <div className="text-[11px] text-nc-ink-soft">{lesson.subject} · הכנה עצמאית</div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span
          className={`text-[11px] ${done ? 'font-extrabold text-nc-brand' : 'text-nc-ink-soft'}`}
        >
          {done ? '✓ הושלם' : 'ממתין ללמידה'}
        </span>
        <button type="button" className={btn.outlineSm} onClick={onOpen}>
          {done ? 'צפייה' : 'פתיחה'}
        </button>
      </div>
    </div>
  )
}

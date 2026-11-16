import type { Dispatch } from 'react'

import { DEMO_LESSONS, LESSON_TYPE_LABEL } from './classDemoLessons'
import type { DemoLesson } from './classDemoLessons'
import { counter, panel } from './classDemoStyles'
import type { ClassDemoAction, ClassDemoState } from './classDemoState'
import { LessonTypeIcon } from './LessonTypeIcon'
import { EmptyState, LessonFilters } from './WorkspaceChrome'

interface TeacherContentProps {
  state: ClassDemoState
  dispatch: Dispatch<ClassDemoAction>
}

export function TeacherContent({ state, dispatch }: TeacherContentProps) {
  const items = DEMO_LESSONS.filter(
    (l) =>
      (state.teacherFilter === 'all' || state.teacherFilter === l.type) &&
      l.title.includes(state.search.trim()),
  )

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-content-gap sm:items-center">
        <div>
          <h3 className="mt-0 mb-1 text-heading-xl font-bold tracking-[-.4px] sm:text-[23px]">
            מאגר השיעורים
          </h3>
          <p className="m-0 text-[13px] text-nc-ink-2">
            בחרו אילו שיעורים יהיו זמינים לתלמידי {state.klass}.
          </p>
        </div>
        <span className={counter}>{state.published.length} שיעורים פתוחים</span>
      </div>
      <div className={`${panel} overflow-hidden rounded-[18px]`}>
        <div className="flex flex-col items-stretch justify-between gap-content-gap border-b border-nc-line px-5 py-section-xs sm:flex-row sm:items-center">
          <LessonFilters current={state.teacherFilter} dispatch={dispatch} />
          <input
            type="search"
            value={state.search}
            placeholder="חיפוש שיעור..."
            aria-label="חיפוש שיעור"
            onChange={(e) => dispatch({ type: 'setSearch', search: e.target.value })}
            className="w-full rounded-[10px] border border-nc-line bg-nc-aguy-bg px-3 py-2.5 text-body-xs text-nc-ink sm:w-auto sm:min-w-[210px]"
          />
        </div>
        <div className="px-2">
          {items.length ? (
            items.map((lesson) => (
              <LessonToggleRow
                key={lesson.id}
                lesson={lesson}
                on={state.published.includes(lesson.id)}
                onToggle={() => dispatch({ type: 'togglePublished', id: lesson.id })}
              />
            ))
          ) : (
            <EmptyState>לא נמצאו שיעורים בחיפוש.</EmptyState>
          )}
        </div>
        <div className="border-t border-nc-line bg-nc-aguy-bg px-5 py-3 text-[11px] text-nc-ink-soft">
          השינויים מתעדכנים מיד באזור התלמיד בדמו. ניתן לבדוק זאת דרך &quot;תצוגת תלמיד&quot;.
        </div>
      </div>
    </>
  )
}

interface LessonToggleRowProps {
  lesson: DemoLesson
  on: boolean
  onToggle: () => void
}

function LessonToggleRow({ lesson, on, onToggle }: LessonToggleRowProps) {
  return (
    <div className="flex min-h-[87px] flex-wrap items-center gap-content-gap-xs.5 border-b border-nc-divider px-2 py-section-xs last:border-b-0 sm:flex-nowrap sm:gap-3.5 sm:px-4">
      <LessonTypeIcon type={lesson.type} />
      <div className="min-w-0 flex-[1_1_calc(100%-70px)] sm:flex-1">
        <h4 className="mt-0 mb-1 text-body-sm font-extrabold">{lesson.title}</h4>
        <div className="flex flex-wrap items-center gap-content-gap-xs.5 text-[11px] text-nc-ink-soft">
          <b className="font-bold text-nc-ink-2">{LESSON_TYPE_LABEL[lesson.type]}</b>
          <span>·</span>
          <span>{lesson.subject}</span>
          <span>·</span>
          <span>{lesson.minutes} דקות</span>
        </div>
      </div>
      <div className="ms-[50px] flex w-[calc(100%-50px)] items-center justify-between gap-3.5 sm:ms-0 sm:w-auto">
        <span
          className={`text-[11px] whitespace-nowrap ${on ? 'font-extrabold text-nc-brand' : 'text-nc-ink-soft'}`}
        >
          {on ? 'מוצג לתלמידים' : 'לא מוצג'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${on ? 'הסתרת' : 'הצגת'} ${lesson.title} לתלמידים`}
          onClick={onToggle}
          className={`relative h-[25px] w-[43px] flex-none cursor-pointer rounded-full transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nc-brand-light ${on ? 'bg-nc-brand' : 'bg-nc-mock-line'}`}
        >
          <span
            className={`absolute top-[3px] right-[3px] size-[19px] rounded-full bg-white shadow-elevation-1 transition-transform ${on ? '-translate-x-[18px]' : ''}`}
          />
        </button>
      </div>
    </div>
  )
}

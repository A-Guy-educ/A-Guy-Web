import type { Dispatch } from 'react'

import { LESSON_TYPE_LABEL, publishedLessons } from './classDemoLessons'
import { btn, counter, panel } from './classDemoStyles'
import type { ClassDemoAction, ClassDemoState } from './classDemoState'
import { LessonTypeIcon } from './LessonTypeIcon'
import { EmptyState, LessonFilters } from './WorkspaceChrome'

interface StudentContentProps {
  state: ClassDemoState
  dispatch: Dispatch<ClassDemoAction>
}

export function StudentContent({ state, dispatch }: StudentContentProps) {
  const all = publishedLessons(state.published)
  const lessons = all.filter((l) => state.studentFilter === 'all' || l.type === state.studentFilter)

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-content-gap sm:items-center">
        <div>
          <h3 className="mt-0 mb-1 text-heading-xl font-bold sm:text-[23px]">התוכן שלי</h3>
          <p className="m-0 text-[13px] text-nc-ink-2">רק שיעורים שהמורה פתח לכיתה מוצגים כאן.</p>
        </div>
        <span className={counter}>{all.length} שיעורים זמינים</span>
      </div>
      <div className={`${panel} overflow-hidden rounded-[18px]`}>
        <div className="border-b border-nc-line px-5 py-section-xs">
          <LessonFilters current={state.studentFilter} dispatch={dispatch} />
        </div>
        <div className="p-card-padding-sm">
          {lessons.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex flex-wrap items-center gap-3 rounded-[15px] border border-nc-line bg-nc-paper p-card-padding-sm sm:flex-nowrap"
                >
                  <LessonTypeIcon type={lesson.type} />
                  <div className="min-w-0 flex-1">
                    <h4 className="mt-0 mb-1.5 text-body-sm font-bold">{lesson.title}</h4>
                    <div className="text-[11px] text-nc-ink-soft">
                      {LESSON_TYPE_LABEL[lesson.type]} · {lesson.minutes} דקות
                      {state.done.includes(lesson.id) && ' · הושלם'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={btn.outlineSm}
                    onClick={() => dispatch({ type: 'openLesson', id: lesson.id })}
                  >
                    פתיחה
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>אין שיעורים להצגה בסינון הנוכחי.</EmptyState>
          )}
        </div>
      </div>
    </>
  )
}

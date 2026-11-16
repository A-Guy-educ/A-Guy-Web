import { BookOpen } from 'lucide-react'
import type { Dispatch } from 'react'

import { btn, wrap } from './classDemoStyles'
import type { ClassDemoAction, ClassDemoState } from './classDemoState'
import { StudentContent } from './StudentContent'
import { StudentDashboard } from './StudentDashboard'
import { WorkspaceBar, WorkspaceTabs } from './WorkspaceChrome'

interface StudentWorkspaceProps {
  state: ClassDemoState
  dispatch: Dispatch<ClassDemoAction>
}

export function StudentWorkspace({ state, dispatch }: StudentWorkspaceProps) {
  return (
    <div className={`${wrap} pt-5 pb-[70px] sm:pt-8`}>
      {state.preview && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-[11px] border border-nc-brand-tint bg-nc-brand-tint/40 px-3.5 py-2 text-body-xs text-nc-brand-deep sm:items-center">
          <span>
            <strong>תצוגת תלמיד:</strong> כך נראים השיעורים שפתחת לכיתה.
          </span>
          <button
            type="button"
            className={btn.outlineSm}
            onClick={() => dispatch({ type: 'endPreview' })}
          >
            חזרה למורה
          </button>
        </div>
      )}
      <WorkspaceBar
        label="אזור תלמיד"
        name={state.preview ? 'נועם' : state.name || 'נועם'}
        subtitle="כל מה שצריך כדי להגיע מוכנים לשיעור הבא."
        classChip={
          <>
            <BookOpen className="size-4" aria-hidden="true" /> {state.klass} · מתמטיקה
          </>
        }
      />
      <WorkspaceTabs tab={state.tab} dashboardLabel="הדשבורד שלי" dispatch={dispatch} />
      {state.tab === 'dashboard' ? (
        <StudentDashboard state={state} dispatch={dispatch} />
      ) : (
        <StudentContent state={state} dispatch={dispatch} />
      )}
    </div>
  )
}

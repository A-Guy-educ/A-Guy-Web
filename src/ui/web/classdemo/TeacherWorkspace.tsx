import { Users } from 'lucide-react'
import type { Dispatch } from 'react'

import { btn, wrap } from './classDemoStyles'
import type { ClassDemoAction, ClassDemoState } from './classDemoState'
import { TeacherContent } from './TeacherContent'
import { TeacherDashboard } from './TeacherDashboard'
import { WorkspaceBar, WorkspaceTabs } from './WorkspaceChrome'

interface TeacherWorkspaceProps {
  state: ClassDemoState
  dispatch: Dispatch<ClassDemoAction>
}

export function TeacherWorkspace({ state, dispatch }: TeacherWorkspaceProps) {
  return (
    <div className={`${wrap} pt-5 pb-[70px] sm:pt-8`}>
      <WorkspaceBar
        label="אזור מורה"
        name={state.name || 'מאיה'}
        subtitle="מכאן מנהלים את התוכן ואת ההתקדמות של הכיתה."
        classChip={
          <>
            <Users className="size-4" aria-hidden="true" /> {state.klass} · מתמטיקה
          </>
        }
        actions={
          <button
            type="button"
            className={btn.outlineSm}
            onClick={() => dispatch({ type: 'startPreview' })}
          >
            תצוגת תלמיד
          </button>
        }
      />
      <WorkspaceTabs tab={state.tab} dashboardLabel="דשבורד כיתה" dispatch={dispatch} />
      {state.tab === 'dashboard' ? (
        <TeacherDashboard published={state.published} dispatch={dispatch} />
      ) : (
        <TeacherContent state={state} dispatch={dispatch} />
      )}
    </div>
  )
}

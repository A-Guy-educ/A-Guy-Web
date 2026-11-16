'use client'

import { useCallback, useEffect, useReducer } from 'react'

import { ClassDemoHeader } from './ClassDemoHeader'
import { ClassDemoHome } from './ClassDemoHome'
import { DEMO_LESSONS } from './classDemoLessons'
import { ClassDemoRegister } from './ClassDemoRegister'
import { classDemoReducer, initialClassDemoState } from './classDemoState'
import { LessonPreviewDialog } from './LessonPreviewDialog'
import { StudentWorkspace } from './StudentWorkspace'
import { TeacherWorkspace } from './TeacherWorkspace'

// Interactive walkthrough of the school flow: landing → pick a role → teacher
// opens lessons for the class / student sees only the opened lessons. All state
// is in memory; reloading the page starts the demo over.
export function ClassDemo() {
  const [state, dispatch] = useReducer(classDemoReducer, initialClassDemoState)
  const closeLesson = useCallback(() => dispatch({ type: 'closeLesson' }), [])
  const openLesson = DEMO_LESSONS.find((l) => l.id === state.openLessonId)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [state.screen])

  return (
    <>
      <ClassDemoHeader screen={state.screen} dispatch={dispatch} />
      <main>
        {state.screen === 'home' && <ClassDemoHome dispatch={dispatch} />}
        {state.screen === 'register' && <ClassDemoRegister state={state} dispatch={dispatch} />}
        {state.screen === 'teacher' && <TeacherWorkspace state={state} dispatch={dispatch} />}
        {state.screen === 'student' && <StudentWorkspace state={state} dispatch={dispatch} />}
      </main>
      {openLesson && (
        <LessonPreviewDialog
          lesson={openLesson}
          done={state.done.includes(openLesson.id)}
          onClose={closeLesson}
          onComplete={() => dispatch({ type: 'completeLesson', id: openLesson.id })}
        />
      )}
    </>
  )
}

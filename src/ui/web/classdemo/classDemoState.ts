// Client-only state machine for the /classdemo walkthrough. Nothing is sent to
// the server: "registration" just picks which workspace to show.

import { INITIAL_DONE, INITIAL_PUBLISHED } from './classDemoLessons'
import type { LessonFilter } from './classDemoLessons'

export type DemoScreen = 'home' | 'register' | 'teacher' | 'student'
export type DemoRole = 'teacher' | 'student'
export type DemoTab = 'dashboard' | 'content'
export type ProfileField = 'name' | 'school' | 'klass'

export interface ClassDemoState {
  screen: DemoScreen
  role: DemoRole
  tab: DemoTab
  name: string
  school: string
  klass: string
  published: readonly string[]
  done: readonly string[]
  teacherFilter: LessonFilter
  studentFilter: LessonFilter
  search: string
  /** Teacher is looking at the student workspace ("תצוגת תלמיד"). */
  preview: boolean
  openLessonId: string | null
}

export type ClassDemoAction =
  | { type: 'home' }
  | { type: 'register' }
  | { type: 'pickRole'; role: DemoRole }
  | { type: 'setField'; field: ProfileField; value: string }
  | { type: 'enter' }
  | { type: 'setTab'; tab: DemoTab }
  | { type: 'showContent'; screen: 'teacher' | 'student' }
  | { type: 'startPreview' }
  | { type: 'endPreview' }
  | { type: 'setFilter'; filter: LessonFilter }
  | { type: 'setSearch'; search: string }
  | { type: 'togglePublished'; id: string }
  | { type: 'openLesson'; id: string }
  | { type: 'closeLesson' }
  | { type: 'completeLesson'; id: string }

export const initialClassDemoState: ClassDemoState = {
  screen: 'home',
  role: 'teacher',
  tab: 'dashboard',
  name: '',
  school: 'בית הספר לדוגמה',
  klass: 'ט׳2',
  published: INITIAL_PUBLISHED,
  done: INITIAL_DONE,
  teacherFilter: 'all',
  studentFilter: 'all',
  search: '',
  preview: false,
  openLessonId: null,
}

const toggle = (ids: readonly string[], id: string) =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]

export function classDemoReducer(state: ClassDemoState, action: ClassDemoAction): ClassDemoState {
  switch (action.type) {
    case 'home':
      return { ...state, screen: 'home', preview: false }
    case 'register':
      return { ...state, screen: 'register', name: '', preview: false }
    case 'pickRole':
      return { ...state, role: action.role, name: '' }
    case 'setField':
      return { ...state, [action.field]: action.value }
    case 'enter':
      return { ...state, screen: state.role, tab: 'dashboard', preview: false }
    case 'setTab':
      return { ...state, tab: action.tab }
    case 'showContent':
      return { ...state, screen: action.screen, tab: 'content' }
    case 'startPreview':
      return { ...state, screen: 'student', tab: 'dashboard', preview: true }
    case 'endPreview':
      return { ...state, screen: 'teacher', tab: 'content', preview: false }
    case 'setFilter':
      return state.screen === 'teacher'
        ? { ...state, teacherFilter: action.filter }
        : { ...state, studentFilter: action.filter }
    case 'setSearch':
      return { ...state, search: action.search }
    case 'togglePublished':
      return { ...state, published: toggle(state.published, action.id) }
    case 'openLesson':
      return { ...state, openLessonId: action.id }
    case 'closeLesson':
      return { ...state, openLessonId: null }
    case 'completeLesson':
      return state.done.includes(action.id)
        ? { ...state, openLessonId: null }
        : { ...state, done: [...state.done, action.id], openLessonId: null }
  }
}

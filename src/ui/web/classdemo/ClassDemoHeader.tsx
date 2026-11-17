import type { Dispatch } from 'react'

import { btn } from './classDemoStyles'
import type { ClassDemoAction, DemoScreen } from './classDemoState'

interface ClassDemoHeaderProps {
  screen: DemoScreen
  dispatch: Dispatch<ClassDemoAction>
}

export function ClassDemoHeader({ screen, dispatch }: ClassDemoHeaderProps) {
  const inWorkspace = screen === 'teacher' || screen === 'student'
  return (
    <header className="relative z-[3] flex min-h-[70px] items-center justify-between gap-content-gap border-b border-nc-line bg-nc-paper px-4 sm:h-[82px] sm:px-[max(28px,calc((100vw-1120px)/2))]">
      <button
        type="button"
        onClick={() => dispatch({ type: 'home' })}
        className="flex cursor-pointer items-center gap-3 rounded-xl text-nc-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nc-brand-light"
      >
        <span
          dir="ltr"
          className="flex size-10 items-center justify-center rounded-[13px] bg-nc-ink font-nc-display text-[22px] font-bold text-white"
        >
          a<span className="text-nc-brand-light">.</span>
        </span>
        <span className="flex items-center gap-[10px] font-nc-display text-body-sm font-bold sm:text-body-lg">
          <span dir="ltr" className="text-body-md sm:text-heading-xl">
            Aguy
          </span>
          <span className="h-5 w-px bg-nc-line" aria-hidden="true" />
          <span>הכיתה החדשה</span>
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="hidden rounded-full bg-nc-mock-bar px-2.5 py-1 text-[11px] font-extrabold text-nc-ink-soft sm:inline">
          DEMO · נתוני המחשה
        </span>
        {inWorkspace ? (
          <button
            type="button"
            className={btn.ghostSm}
            onClick={() => dispatch({ type: 'register' })}
          >
            החלפת תפקיד
          </button>
        ) : screen === 'home' ? (
          <button
            type="button"
            className={btn.outlineSm}
            onClick={() => dispatch({ type: 'register' })}
          >
            הרשמה
          </button>
        ) : null}
      </div>
    </header>
  )
}

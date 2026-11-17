import { ArrowLeft, ArrowRight, Backpack, GraduationCap } from 'lucide-react'
import type { Dispatch } from 'react'

import { btn, panel } from './classDemoStyles'
import type { ClassDemoAction, ClassDemoState, DemoRole, ProfileField } from './classDemoState'

const ROLES: { role: DemoRole; title: string; body: string; Icon: typeof Backpack }[] = [
  { role: 'teacher', title: 'אני מורה', body: 'ניהול כיתה ותוכן', Icon: GraduationCap },
  { role: 'student', title: 'אני תלמיד/ה', body: 'השיעורים שלי', Icon: Backpack },
]

interface ClassDemoRegisterProps {
  state: ClassDemoState
  dispatch: Dispatch<ClassDemoAction>
}

export function ClassDemoRegister({ state, dispatch }: ClassDemoRegisterProps) {
  const isTeacher = state.role === 'teacher'
  const fields: { field: ProfileField; label: string; placeholder?: string }[] = [
    {
      field: 'name',
      label: 'שם מלא',
      placeholder: isTeacher ? 'לדוגמה: מאיה לוי' : 'לדוגמה: נועם כהן',
    },
    { field: 'school', label: 'בית ספר' },
    { field: 'klass', label: 'כיתה' },
  ]

  return (
    <div className="mx-auto max-w-[780px] px-4 pt-7 pb-[74px] sm:px-[22px] sm:pt-12">
      <button
        type="button"
        onClick={() => dispatch({ type: 'home' })}
        className="inline-flex cursor-pointer items-center gap-1.5 pb-4 text-[13px] font-bold text-nc-ink-2"
      >
        <ArrowRight className="size-4" aria-hidden="true" /> חזרה לעמוד הבית
      </button>
      <h2 className="my-1 font-nc-display text-[34px] font-extrabold tracking-[-.8px]">
        מצטרפים לכיתה החדשה
      </h2>
      <p className="mt-2 mb-6 text-body-sm leading-[1.8] text-nc-ink-2">
        בחרו תפקיד כדי להיכנס להדגמה של סביבת בית הספר.
      </p>
      <section className={`${panel} rounded-[23px] p-5 sm:p-7`}>
        <div
          className="mb-6 grid grid-cols-2 gap-[10px] sm:gap-3"
          role="radiogroup"
          aria-label="תפקיד"
        >
          {ROLES.map(({ role, title, body, Icon }) => {
            const active = state.role === role
            return (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => dispatch({ type: 'pickRole', role })}
                className={`flex cursor-pointer items-center gap-content-gap-xs rounded-[15px] border-[1.5px] p-3 text-start sm:gap-3 sm:p-5 ${active ? 'border-nc-brand bg-nc-brand-tint/40' : 'border-nc-line bg-nc-paper'}`}
              >
                <span
                  className={`grid size-9 flex-none place-items-center rounded-[13px] sm:size-11 ${active ? 'bg-nc-brand-tint text-nc-brand-deep' : 'bg-nc-mock-bar text-nc-ink-2'}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <strong className="text-[13px] sm:text-[15px]">{title}</strong>
                  <small className="block text-[10px] text-nc-ink-soft sm:text-body-xs">
                    {body}
                  </small>
                </span>
              </button>
            )
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-[18px]">
          {fields.map(({ field, label, placeholder }) => (
            <div key={field}>
              <label
                htmlFor={`cd-${field}`}
                className="mb-2 block text-body-xs font-extrabold text-nc-ink-2"
              >
                {label}
              </label>
              <input
                id={`cd-${field}`}
                value={state[field]}
                placeholder={placeholder}
                onChange={(e) => dispatch({ type: 'setField', field, value: e.target.value })}
                className="w-full rounded-[11px] border border-nc-line bg-nc-paper px-3 py-3 text-body-sm text-nc-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nc-brand-light"
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col-reverse items-start gap-5 border-t border-nc-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="max-w-[360px] text-body-xs text-nc-ink-soft">
            זו הרשמה לדמו בלבד. הפרטים לא נשלחים לשרת ואינם יוצרים חשבון אמיתי.
          </span>
          <button type="button" className={btn.primary} onClick={() => dispatch({ type: 'enter' })}>
            כניסה בתור {isTeacher ? 'מורה' : 'תלמיד/ה'}
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  )
}

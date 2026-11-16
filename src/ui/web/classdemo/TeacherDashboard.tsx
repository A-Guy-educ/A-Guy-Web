import type { Dispatch } from 'react'

import { CLASS_SIZE, DEMO_LESSONS, publishedLessons, readyPercent } from './classDemoLessons'
import { btn, panel } from './classDemoStyles'
import type { ClassDemoAction } from './classDemoState'
import { EmptyState } from './WorkspaceChrome'

const ATTENTION = [
  { initial: 'א', name: 'אורי ל.', note: 'ממתין להשלמת ההכנה', tag: 'טרם התחיל' },
  { initial: 'נ', name: 'נועה ר.', note: 'נתקלה בקושי בשיפוע', tag: 'דורש חיזוק' },
  { initial: 'ד', name: 'דניאל כ.', note: 'נשאר תרגיל אחרון', tag: 'בתהליך' },
]

interface TeacherDashboardProps {
  published: readonly string[]
  dispatch: Dispatch<ClassDemoAction>
}

export function TeacherDashboard({ published, dispatch }: TeacherDashboardProps) {
  const lessons = publishedLessons(published)
  const next = lessons[0]
  const stats = [
    { label: 'תלמידים בכיתה', value: String(CLASS_SIZE), foot: 'כיתה לדוגמה' },
    {
      label: 'השלימו הכנה לשיעור הבא',
      value: String(next?.ready ?? 0),
      suffix: ` / ${CLASS_SIZE}`,
      foot: next?.title ?? 'לא נפתחו שיעורים',
    },
    { label: 'מוכנות לשיעור הבא', value: `${next ? readyPercent(next) : 0}%`, foot: 'נתון המחשה' },
    {
      label: 'שיעורים פתוחים לכיתה',
      value: String(lessons.length),
      foot: `מתוך ${DEMO_LESSONS.length} במאגר`,
    },
  ]

  return (
    <>
      <div className="mb-[18px] grid grid-cols-2 gap-content-gap-xs.5 md:grid-cols-4 md:gap-[15px]">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`${panel} min-h-[110px] p-card-padding-sm sm:min-h-32 sm:p-5`}
          >
            <span className="mb-3 block text-body-xs font-semibold text-nc-ink-2">{s.label}</span>
            <div className="text-[26px] leading-[1.15] font-extrabold sm:text-[30px]">
              {s.value}
              {s.suffix && <span className="text-[17px] text-nc-ink-soft">{s.suffix}</span>}
            </div>
            <span className="mt-2 block text-[11px] text-nc-ink-soft">{s.foot}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-[18px] lg:grid-cols-[1.5fr_1fr]">
        <section className={`${panel} p-5 sm:p-card-padding`}>
          <div className="mb-5 flex items-center justify-between gap-3.5">
            <h3 className="m-0 text-[17px] font-bold">מוכנות לפי שיעור</h3>
            <button
              type="button"
              className={btn.outlineSm}
              onClick={() => dispatch({ type: 'showContent', screen: 'teacher' })}
            >
              ניהול תוכן
            </button>
          </div>
          {lessons.length ? (
            lessons.map((lesson) => (
              <div key={lesson.id} className="my-5">
                <div className="mb-2.5 flex items-center justify-between gap-content-gap-xs text-body-xs">
                  <strong className="text-[13px]">{lesson.title}</strong>
                  <span className="text-nc-ink-2">
                    {lesson.ready} מתוך {CLASS_SIZE} · {readyPercent(lesson)}%
                  </span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-nc-mock-row">
                  <span
                    className="block h-full rounded-full bg-nc-brand"
                    style={{ width: `${readyPercent(lesson)}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <EmptyState>
              עדיין לא פתחת שיעורים לכיתה. עברו ללשונית התוכן כדי לבחור שיעורים.
            </EmptyState>
          )}
        </section>
        <section className={`${panel} p-5 sm:p-card-padding`}>
          <div className="mb-5 flex items-center justify-between gap-3.5">
            <h3 className="m-0 text-[17px] font-bold">תלמידים שכדאי לבדוק</h3>
            <small className="text-[11px] text-nc-ink-soft">נתוני הדגמה</small>
          </div>
          {ATTENTION.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-3 border-b border-nc-divider py-3 text-body-xs last:border-b-0"
            >
              <span className="grid size-[34px] flex-none place-items-center rounded-full bg-nc-teacher-tint font-extrabold text-nc-teacher">
                {s.initial}
              </span>
              <span>
                <strong className="block">{s.name}</strong>
                <small className="text-nc-ink-soft">{s.note}</small>
              </span>
              <span className="ms-auto rounded-[7px] bg-nc-mock-cream px-2 py-1 text-[11px] font-bold text-nc-grade-mid">
                {s.tag}
              </span>
            </div>
          ))}
          <div className="mt-5 rounded-xl border border-nc-brand-tint bg-nc-brand-tint/40 px-4 py-3 text-body-xs text-nc-brand-deep">
            המידע בדמו להמחשה בלבד. במערכת האמיתית הדשבורד יציג נתונים מהלמידה של התלמידים.
          </div>
        </section>
      </div>
    </>
  )
}

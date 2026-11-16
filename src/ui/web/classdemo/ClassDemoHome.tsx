import { ArrowLeft, BookOpen, ChartLine, Check, Users } from 'lucide-react'
import type { Dispatch } from 'react'

import { btn, eyebrow, wrap } from './classDemoStyles'
import type { ClassDemoAction } from './classDemoState'

const STEPS = [
  { title: 'המורה פותח שיעור', body: 'בוחר מה יופיע לתלמידי הכיתה', Icon: Check },
  { title: 'התלמיד מתכונן בעצמו', body: 'בקצב אישי, עם Aguy', Icon: Check },
  { title: 'הכיתה מגיעה מוכנה', body: 'המורה יודע היכן להתמקד', Icon: ChartLine },
]

const FEATURES = [
  {
    title: 'תוכן בשליטת המורה',
    body: 'בחירה פשוטה של שיעורי לימוד, תרגול ובחינה.',
    Icon: BookOpen,
  },
  { title: 'תמונת מצב בזמן אמת', body: 'מי התכונן, מי מתקדם והיכן צריך עזרה.', Icon: ChartLine },
  {
    title: 'לומדים לפני שנכנסים לכיתה',
    body: 'משאירים את זמן המפגש לתרגול, חשיבה ושיח.',
    Icon: Users,
  },
]

export function ClassDemoHome({ dispatch }: { dispatch: Dispatch<ClassDemoAction> }) {
  return (
    <div className={wrap}>
      <section className="grid items-center gap-7 pt-10 pb-9 md:min-h-[612px] md:grid-cols-2 md:gap-11 md:pt-20 md:pb-20">
        <div>
          <span className={eyebrow}>סביבת הלמידה החדשה לבתי ספר</span>
          <h1 className="my-5 font-nc-display text-[clamp(44px,5.5vw,74px)] leading-[1.12] font-extrabold tracking-[-2px]">
            הכיתה
            <br />
            <span className="text-nc-brand">החדשה.</span>
          </h1>
          <p className="mb-3 max-w-[500px] text-[17px] leading-[1.75] font-semibold sm:text-heading-xl">
            התלמידים מגיעים מוכנים.
            <br />
            השיעור בכיתה מתחיל אחרת.
          </p>
          <p className="mb-7 max-w-[485px] text-[15px] leading-[1.9] text-nc-ink-2">
            המורה בוחר אילו שיעורים לפתוח לכיתה. התלמידים לומדים באופן עצמאי לפני המפגש, והמורה רואה
            תמונת מצב ומקדיש את זמן הכיתה למה שבאמת צריך.
          </p>
          <div className="flex flex-wrap items-center gap-content-gap">
            <button
              type="button"
              className={btn.primary}
              onClick={() => dispatch({ type: 'register' })}
            >
              הרשמה <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
            <span className="text-body-xs text-nc-ink-soft">
              הדגמה אינטראקטיבית · ללא יצירת חשבון
            </span>
          </div>
        </div>
        <ProcessVisual />
      </section>
      <section className="grid gap-content-gap border-t border-nc-line pt-8 pb-12 md:grid-cols-3 md:gap-content-gap-lg">
        {FEATURES.map(({ title, body, Icon }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="grid size-10 flex-none place-items-center rounded-xl bg-nc-brand-tint text-nc-brand">
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <strong className="text-body-sm">{title}</strong>
              <p className="my-1 text-body-xs leading-[1.7] text-nc-ink-2">{body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

function ProcessVisual() {
  return (
    <div className="relative min-h-[350px] overflow-hidden rounded-[28px] bg-nc-ink p-card-padding text-white shadow-modal sm:min-h-[395px] sm:p-card-padding-lg">
      <div
        className="absolute -top-36 -left-28 size-[375px] rounded-full border border-white/10"
        aria-hidden="true"
      />
      <div className="relative text-body-xs font-bold text-nc-brand-light">
        כך נראית הכיתה החדשה
      </div>
      <div className="relative mt-3 mb-6 font-nc-display text-[22px] leading-[1.4] font-extrabold">
        פחות זמן על הסברים חוזרים.
        <br />
        יותר זמן על למידה.
      </div>
      <ol className="relative flex flex-col gap-3">
        {STEPS.map(({ title, body, Icon }, i) => (
          <li
            key={title}
            className={`flex items-center gap-3.5 rounded-[15px] border px-4 py-3.5 ${i === 1 ? 'border-nc-brand-light/50 bg-nc-brand/40' : 'border-white/15 bg-white/5'}`}
          >
            <span className="grid size-[34px] flex-none place-items-center rounded-[11px] bg-white/15 font-extrabold">
              0{i + 1}
            </span>
            <span className="flex-1">
              <strong className="block text-body-sm">{title}</strong>
              <small className="text-body-xs text-white/65">{body}</small>
            </span>
            <Icon className="size-[17px]" aria-hidden="true" />
          </li>
        ))}
      </ol>
      <div className="absolute bottom-4 left-4 -rotate-[5deg] rounded-[10px] bg-nc-brand-on px-3 py-2 text-[11px] font-extrabold text-nc-brand-deep">
        למידה פעילה. כיתה אחרת.
      </div>
    </div>
  )
}

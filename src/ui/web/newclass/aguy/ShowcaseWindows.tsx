import type { ReactNode } from 'react'

// Static mockups for the A-guy illustration: a practice screen, the digital
// teacher's explanation, and the teacher dashboard. Purely decorative.

const win =
  'overflow-hidden rounded-2xl bg-nc-paper text-[13px] leading-[1.55] text-nc-ink shadow-card-hover sm:absolute'

function WindowBar({ url }: { url: string }) {
  return (
    <div dir="ltr" className="flex items-center gap-1.5 bg-nc-mock-bar px-3 py-2.5">
      <i className="block size-[9px] rounded-full bg-nc-student" />
      <i className="block size-[9px] rounded-full bg-nc-mock-yellow" />
      <i className="block size-[9px] rounded-full bg-nc-class" />
      <span className="ms-2 flex-1 rounded-md bg-white px-2 py-0.5 text-start text-[11px] text-nc-ink-2">
        {url}
      </span>
    </div>
  )
}

function Ltr({ children }: { children: ReactNode }) {
  return <span dir="ltr">{children}</span>
}

export function StudentWindow({ className }: { className: string }) {
  return (
    <div className={`${win} ${className}`}>
      <WindowBar url="aguy.co.il" />
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between text-sm">
          <strong>שיפוע של ישר</strong>
          <span className="text-[11px] text-nc-ink-2">תרגיל 4/20</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-[3px] bg-nc-mock-bar">
          <div className="h-full w-1/5 bg-nc-aguy" />
        </div>
        <div className="rounded-xl bg-nc-ground px-3 py-2.5">
          שיפוע אומר לנו בכמה הגובה משתנה כשמתקדמים יחידה אחת ימינה. בוא ננסה יחד.
        </div>
        <div className="rounded-xl bg-nc-mock-cream px-3 py-2.5">
          מה השיפוע של הישר שעובר בנקודות <Ltr>(1,2)</Ltr> ו-<Ltr>(3,6)</Ltr>?
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-nc-mock-line px-3.5 py-[5px]">4</span>
          <span className="rounded-lg border-2 border-nc-aguy bg-nc-aguy-tint px-3.5 py-[5px] font-bold">
            2
          </span>
          <span className="rounded-lg border border-nc-mock-line px-3.5 py-[5px]">½</span>
        </div>
        <span className="self-start rounded-lg bg-nc-aguy px-3.5 py-1.5 text-xs font-semibold text-white">
          המשך
        </span>
      </div>
    </div>
  )
}

export function ChatWindow({ className }: { className: string }) {
  return (
    <div className={`${win} ${className}`}>
      <div className="flex items-center gap-2.5 border-b border-nc-line px-3.5 py-3">
        <span className="flex size-[30px] flex-none items-center justify-center rounded-full bg-nc-aguy font-nc-display text-[13px] font-extrabold text-white">
          A
        </span>
        <div>
          <strong className="block text-[13px] leading-[1.3]">A-guy</strong>
          <small className="text-[11px] text-nc-ink-2">המורה הדיגיטלי</small>
        </div>
      </div>
      <div className="flex flex-col gap-[9px] px-3.5 pt-3 pb-3.5">
        <div className="max-w-[85%] self-end rounded-[12px_12px_12px_4px] bg-nc-mock-bar px-3 py-2">
          לא הבנתי למה השיפוע יוצא 2
        </div>
        <div className="max-w-[92%] self-start rounded-[12px_12px_4px_12px] bg-nc-aguy-tint px-3 py-[9px]">
          בוא נבדוק יחד. מ-x=1 ל-x=3 התקדמנו 2 יחידות ימינה, ובאותו זמן y עלה מ-2 ל-6, כלומר 4
          יחידות למעלה.
          <div
            dir="ltr"
            className="mt-1.5 rounded-lg border border-nc-aguy-line bg-nc-paper px-2 py-1.5 text-center text-[13px] font-semibold tabular-nums"
          >
            m = (6 − 2) ÷ (3 − 1) = 4 ÷ 2 = 2
          </div>
        </div>
        <div className="max-w-[92%] self-start rounded-[12px_12px_4px_12px] bg-nc-aguy-tint px-3 py-[9px]">
          על כל צעד ימינה, הישר עולה 2. רוצה לנסות תרגיל דומה?
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['כן, תרגיל דומה', 'תסביר שוב'].map((q) => (
            <span
              key={q}
              className="rounded-full border border-nc-aguy px-2.5 py-[3px] text-[11.5px] font-semibold text-nc-aguy"
            >
              {q}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const ROSTER = [
  { name: 'נועה ל.', grade: 92, independence: '78%', tone: 'text-nc-grade-good' },
  { name: 'דניאל ש.', grade: 71, independence: '54%', tone: 'text-nc-grade-mid' },
  { name: 'מאיה ר.', grade: 48, independence: '22%', tone: 'text-nc-grade-low', flag: true },
  { name: 'רועי א.', grade: 85, independence: '66%', tone: 'text-nc-grade-good' },
]

const row =
  'grid grid-cols-3 items-center border-b border-nc-mock-row py-2 [&>*:not(:first-child)]:text-center'

export function TeacherWindow({ className }: { className: string }) {
  return (
    <div className={`${win} ${className}`}>
      <WindowBar url="teacher.aguy.co.il" />
      <div className="flex items-center justify-between bg-nc-mock-dash px-4 py-3 text-white">
        <strong>כיתה ט׳ – תמונת הכיתה</strong>
        <span className="text-[11px] opacity-85">13 תלמידים</span>
      </div>
      <div className="px-4 pt-1.5 pb-3.5 tabular-nums">
        <div className={`${row} border-nc-line text-nc-ink-2`}>
          <span>תלמיד</span>
          <span>ציון</span>
          <span>עצמאות</span>
        </div>
        {ROSTER.map((s) => (
          <div
            key={s.name}
            className={`${row} last:border-b-0 ${s.flag ? '-mx-4 bg-nc-mock-flag px-4' : ''}`}
          >
            <span>{s.name}</span>
            <strong className={s.tone}>{s.grade}</strong>
            <span>{s.independence}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

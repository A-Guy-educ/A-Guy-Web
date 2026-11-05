import { ViewSection } from '../program/ProgramBlocks'

const CURRICULUM = [
  { grade: 'ז׳', detail: 'כיתה ז׳' },
  { grade: 'ח׳', detail: 'בסיס · מתקדם' },
  { grade: 'ט׳', detail: 'בסיס · מתקדם' },
  { grade: 'י׳', detail: '3 יח"ל (שאלון 172) · 4 יח"ל · 5 יח"ל' },
  { grade: 'י״א', detail: 'שאלונים 371 · 471 · 571' },
  { grade: 'י״ב', detail: 'שאלונים 372 · 472 · 572' },
]

const DASHBOARD_FEATURES = [
  'ציון לכל תלמיד, בכל שיעור, וממוצע כיתתי',
  'מדד עצמאות: כמה התלמיד פתר בעצמו',
  'זמן למידה בכל שיעור',
  'מיון לפי ציון, מדד עצמאות או שיעור אחרון',
  'כמה כיתות במקום אחד',
]

export function AguyCurriculum() {
  return (
    <ViewSection title="מה יש בפנים: מעל 1000 שיעורים במתמטיקה" alt>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3">
        {CURRICULUM.map((c) => (
          <div
            key={c.grade}
            className="flex flex-col gap-1.5 rounded-2xl border border-nc-line bg-nc-paper p-[18px]"
          >
            <strong className="font-nc-display text-xl text-nc-brand-deep">{c.grade}</strong>
            <span className="text-[15px] text-nc-ink-2">{c.detail}</span>
          </div>
        ))}
      </div>
    </ViewSection>
  )
}

export function AguyDashboardFeatures() {
  return (
    <ViewSection title="מה המורה רואה בדשבורד">
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3">
        {DASHBOARD_FEATURES.map((f) => (
          <li
            key={f}
            className="flex items-start gap-3 rounded-2xl border border-nc-line bg-nc-paper p-[18px]"
          >
            <i className="flex size-6 flex-none items-center justify-center rounded-full bg-nc-brand-tint text-[13px] font-bold text-nc-brand-deep not-italic">
              ✓
            </i>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </ViewSection>
  )
}

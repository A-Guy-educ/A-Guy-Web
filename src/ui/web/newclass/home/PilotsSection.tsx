import { section, wrap } from '../newclassStyles'
import { SectionHead } from '../SectionHead'

const KPIS = [
  { value: '2', label: 'בתי ספר בפיילוטים', color: 'text-nc-teacher-deep' },
  { value: '4,350', label: 'תלמידים שלומדים עם A-guy', color: 'text-nc-student-deep' },
  { value: '4', label: 'מחזורים של לומדים ללמד', color: 'text-nc-class-deep' },
]

export function PilotsSection() {
  return (
    <section id="pilots" className={section}>
      <div className={wrap}>
        <SectionHead kicker="אחרים אומרים עלינו" title="מה קורה בבתי הספר שכבר עובדים איתנו" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-content-gap">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="flex flex-col gap-1 rounded-[20px] bg-nc-paper p-7">
              <b className={`font-nc-display text-[38px] font-extrabold ${kpi.color}`}>
                {kpi.value}
              </b>
              <span className="text-nc-ink-2">{kpi.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

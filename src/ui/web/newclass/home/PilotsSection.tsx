import { section, wrap } from '../newclassStyles'
import { SectionHead } from '../SectionHead'

const KPIS = [
  { value: '[מספר]', label: 'בתי ספר בפיילוט', color: 'text-nc-teacher-deep' },
  { value: '[מספר]', label: 'תלמידים שלומדים עם A-guy', color: 'text-nc-student-deep' },
  { value: '[מספר]', label: 'חונכים שהוכשרו בלומדים ללמד', color: 'text-nc-class-deep' },
]

const QUOTES = [
  {
    quote: '[ציטוט ממורה בפיילוט]',
    who: '[שם]',
    role: '[תפקיד, בית ספר]',
    accent: 'border-t-nc-teacher',
  },
  {
    quote: '[ציטוט מתלמיד או חונך]',
    who: '[שם]',
    role: '[כיתה, בית ספר]',
    accent: 'border-t-nc-student',
  },
  { quote: '[ציטוט ממנהל/ת או הורה]', who: '[שם]', role: '[תפקיד]', accent: 'border-t-nc-class' },
]

export function PilotsSection() {
  return (
    <section id="pilots" className={section}>
      <div className={wrap}>
        <SectionHead kicker="מהשטח" title="מה קורה בבתי הספר שכבר עובדים איתנו" />
        <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="flex flex-col gap-1 rounded-[20px] bg-nc-paper p-7">
              <b className={`font-nc-display text-[38px] font-extrabold ${kpi.color}`}>
                {kpi.value}
              </b>
              <span className="text-nc-ink-2">{kpi.label}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
          {QUOTES.map((q) => (
            <figure
              key={q.quote}
              className={`m-0 flex flex-col gap-5 rounded-[20px] border-t-4 bg-nc-paper p-8 ${q.accent}`}
            >
              <blockquote className="m-0 text-[19px] leading-[1.7]">{q.quote}</blockquote>
              <figcaption className="text-[15px] text-nc-ink-2">
                <strong className="text-nc-ink">{q.who}</strong> · {q.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

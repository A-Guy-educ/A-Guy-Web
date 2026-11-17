import { Clock, Lightbulb, Presentation, type LucideIcon } from 'lucide-react'

import { section, wrap } from '../newclassStyles'
import { SectionHead } from '../SectionHead'

interface Dimension {
  who: string
  title: string
  body: string
  Icon: LucideIcon
  iconBg: string
  whoColor: string
}

const DIMENSIONS: Dimension[] = [
  {
    who: 'התלמיד',
    title: 'פיתוח עצמאות',
    body: 'התלמידים לומדים לגשת לחומר בעצמם, להתמודד עם קושי ולבקש עזרה כשבאמת צריך. העצמאות הזאת נשארת איתם גם מחוץ לשיעור.',
    Icon: Lightbulb,
    iconBg: 'bg-nc-student',
    whoColor: 'text-nc-student-deep',
  },
  {
    who: 'הכיתה',
    title: 'ניהול נכון יותר של הזמן',
    body: 'כל תלמיד מתקדם בקצב שלו, כך ששעות הכיתה והשעות הפרטניות מנוצלות ללמידה, ולא להמתנה או להסברים חוזרים.',
    Icon: Clock,
    iconBg: 'bg-nc-class-mid',
    whoColor: 'text-nc-class-deep',
  },
  {
    who: 'המורה',
    title: 'הקלה על תפקיד המורה',
    body: 'המורה כבר לא מעביר שיעור אחד ל-40 תלמידים. הוא רואה מי מתקדם ומי נתקע, ויכול להיות קשוב לכל אחד.',
    Icon: Presentation,
    iconBg: 'bg-nc-teacher',
    whoColor: 'text-nc-teacher-deep',
  },
]

export function DimsSection() {
  return (
    <section id="dims" className={section}>
      <div className={wrap}>
        <SectionHead kicker="שלושת הממדים" title="מה משתנה כשהכיתה עובדת אחרת">
          שלושה שינויים שקורים יחד: אצל התלמיד, בזמן הכיתה ובתפקיד המורה.
        </SectionHead>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-content-gap-lg">
          {DIMENSIONS.map(({ who, title, body, Icon, iconBg, whoColor }) => (
            <article
              key={who}
              className="flex flex-col gap-3.5 rounded-[20px] bg-nc-paper p-card-padding-lg shadow-card"
            >
              <div className={`flex size-14 items-center justify-center rounded-2xl ${iconBg}`}>
                <Icon className="size-7 text-white" aria-hidden="true" />
              </div>
              <span className={`text-body-sm font-bold ${whoColor}`}>{who}</span>
              <h3 className="font-nc-display text-heading-xl font-bold">{title}</h3>
              <p className="text-nc-ink-2">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

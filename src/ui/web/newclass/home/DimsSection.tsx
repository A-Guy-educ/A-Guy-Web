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
    title: 'למידה עצמאית',
    body: 'כל תלמיד ניגש לחומר בעצמו, מתקדם בקצב שלו ופונה לעזרה רק כשהוא באמת נתקע.',
    Icon: Lightbulb,
    iconBg: 'bg-nc-student',
    whoColor: 'text-nc-student-deep',
  },
  {
    who: 'המורה',
    title: 'הוראה מותאמת',
    body: 'המורה פנוי לשבת עם קבוצות קטנות ולתת מענה אישי, במקום להעביר שיעור אחד ל-40 תלמידים.',
    Icon: Presentation,
    iconBg: 'bg-nc-teacher',
    whoColor: 'text-nc-teacher-deep',
  },
  {
    who: 'הכיתה',
    title: 'מיצוי שעות הלמידה',
    body: 'יותר למידה אמיתית בתוך שעות בית הספר, שעות פרטניות שמנוצלות טוב יותר, ופחות תלות בשיעורים פרטיים.',
    Icon: Clock,
    iconBg: 'bg-nc-class-mid',
    whoColor: 'text-nc-class-deep',
  },
]

export function DimsSection() {
  return (
    <section id="dims" className={section}>
      <div className={wrap}>
        <SectionHead kicker="למידה בשלושה ממדים" title="כיתה אחת. שלושה ממדים שעובדים יחד.">
          החזון שלנו נשען על שלושה עמודים מרכזיים: התלמיד, המורה והכיתה.
        </SectionHead>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
          {DIMENSIONS.map(({ who, title, body, Icon, iconBg, whoColor }) => (
            <article
              key={who}
              className="flex flex-col gap-3.5 rounded-[20px] bg-nc-paper p-8 shadow-card"
            >
              <div className={`flex size-14 items-center justify-center rounded-2xl ${iconBg}`}>
                <Icon className="size-7 text-white" aria-hidden="true" />
              </div>
              <span className={`text-sm font-bold ${whoColor}`}>{who}</span>
              <h3 className="font-nc-display text-2xl font-bold">{title}</h3>
              <p className="text-nc-ink-2">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

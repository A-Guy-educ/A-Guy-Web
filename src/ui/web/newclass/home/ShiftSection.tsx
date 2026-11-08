import Link from 'next/link'

import { section, tag, wrap } from '../newclassStyles'
import { SectionHead } from '../SectionHead'
import { NewClassroomIllustration, OldClassroomIllustration } from './ClassroomIllustrations'

const LEGEND = [
  { label: 'המורה', dot: 'rounded-full bg-nc-brand' },
  { label: 'חונך מלומדים ללמד', dot: 'rounded-full bg-nc-student' },
  { label: 'A-guy', dot: 'rounded-[2px] bg-nc-aguy' },
  { label: 'תלמיד', dot: 'rounded-full bg-nc-seat' },
]

const OLD_POINTS = [
  'מורה אחד מסביר לכולם, באותו קצב',
  'מי שמהיר מחכה, מי שנתקע נשאר מאחור',
  'השאלות נשארות לשיעור פרטי בבית',
]

const NEW_POINTS = [
  'כל תלמיד מתקדם בקצב שלו עם מורה דיגיטלי צמוד',
  'המורה יושב עם מי שבאמת צריך אותו',
  'יותר ידיים בכיתה, בלי עוד שעות הוראה',
]

const DIFFERENCES = [
  {
    title: 'לא רק כלי, תהליך הטמעה מלא',
    body: 'A-guy לא נכנס לבית הספר לבד. אנחנו מלווים את המורים צעד אחר צעד, עד שהשיעור החדש עובד.',
    link: { href: '/newclass/aguy#implement', label: 'לשלבי ההטמעה' },
  },
  {
    title: "לא עוד צ'אט בוט",
    body: "צ'אט בוט נותן תשובה לתלמיד בבית. A-guy עובד בתוך השיעור, ומוביל את התלמיד לפתרון בעצמו.",
  },
  {
    title: 'המורה רואה מי עצמאי ומי צריך אותו',
    body: 'מדד העצמאות בדשבורד מראה בזמן אמת מי מתקדם לבד ומי צריך יד מכוונת, תלמיד אחרי תלמיד.',
  },
  {
    title: 'טכנולוגיה וגם אנשים',
    body: 'לצד המורה הדיגיטלי, בני נוער שהוכשרו ללוות תלמידים בכיתה. שתי דרכים לשבור את אותו מודל ישן.',
  },
]

function PointList({ items, mark, tone }: { items: string[]; mark: string; tone: string }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-base leading-[1.6]">
          <i
            className={`mt-[3px] inline-flex size-5 flex-none items-center justify-center rounded-full text-xs font-bold not-italic ${tone}`}
          >
            {mark}
          </i>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function ShiftSection() {
  return (
    <section id="shift" className={`${section} bg-nc-paper`}>
      <div className={wrap}>
        <SectionHead kicker="הכיתה החדשה" title="כך משתנה מבנה השיעור">
          בכיתה הרגילה כולם מסתכלים לאותו כיוון ומתקדמים באותו קצב. בכיתה החדשה כל תלמיד נמצא בדיוק
          במקום שמתאים לו באותו רגע.
        </SectionHead>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
          <article className="flex flex-col gap-4 rounded-3xl border border-nc-old-line bg-nc-old-bg p-7 text-nc-old-ink">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-nc-display text-2xl font-extrabold">הכיתה הרגילה</h3>
              <span className={`${tag} bg-nc-old-line text-[13px]`}>מורה אחד מול 40</span>
            </div>
            <OldClassroomIllustration />
            <PointList items={OLD_POINTS} mark="–" tone="bg-nc-old-line text-nc-old-ink" />
          </article>
          <article className="flex flex-col gap-4 rounded-3xl border-2 border-nc-brand bg-nc-ground p-7 text-nc-ink">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-nc-display text-2xl font-extrabold text-nc-brand-deep">
                הכיתה החדשה
              </h3>
              <span className={`${tag} bg-nc-brand-tint text-[13px] text-nc-brand-deep`}>
                כולם לומדים, בו זמנית
              </span>
            </div>
            <NewClassroomIllustration />
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-nc-ink-2">
              {LEGEND.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  <b className={`inline-block size-2.5 ${item.dot}`} />
                  {item.label}
                </span>
              ))}
            </div>
            <PointList items={NEW_POINTS} mark="✓" tone="bg-nc-brand text-white" />
          </article>
        </div>

        <h3 className="mt-16 mb-6 font-nc-display text-[26px] font-extrabold">מה שונה אצלנו</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
          {DIFFERENCES.map((d) => (
            <article
              key={d.title}
              className="flex flex-col gap-2.5 rounded-[20px] bg-nc-ground p-7"
            >
              <h4 className="font-nc-display text-xl font-bold text-nc-brand-deep">{d.title}</h4>
              <p className="text-base text-nc-ink-2">
                {d.body}{' '}
                {d.link ? (
                  <Link className="text-nc-brand-deep" href={d.link.href}>
                    {d.link.label}
                  </Link>
                ) : null}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

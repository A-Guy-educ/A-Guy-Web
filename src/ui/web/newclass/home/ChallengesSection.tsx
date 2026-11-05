import Link from 'next/link'
import type { ReactNode } from 'react'

import { section, wrap } from '../newclassStyles'
import { SectionHead } from '../SectionHead'

interface Challenge {
  title: string
  problem: string
  answers: ReactNode[]
}

const CHALLENGES: Challenge[] = [
  {
    title: 'סדר בכיתה שעובדת במקביל',
    problem: 'כשכל תלמיד עושה משהו אחר, הכיתה יכולה להרגיש מפוזרת, ומורים חוששים לאבד שליטה.',
    answers: [
      'הדשבורד מראה למורה בכל רגע מי עובד, מי התקדם ומי נתקע.',
      <>
        בתהליך ההטמעה של A-guy אנחנו מלווים את המורים, עד שהשיעור שעובד במקביל מרגיש טבעי.{' '}
        <Link className="text-nc-brand-deep" href="/newclass/aguy#implement">
          לשלבי ההטמעה
        </Link>
      </>,
      'בכיתות עם לומדים ללמד, החונכים מחזיקים קבוצות קטנות, והמורה לא לבד.',
    ],
  },
  {
    title: 'תלמידים שרק מחפשים את התשובה',
    problem: 'תלמידים רגילים למצוא תשובה ולהמשיך הלאה, בלי לעצור ולהבין למה.',
    answers: [
      'A-guy לא נותן את הפתרון מיד. הוא שואל, מכוון ומחכה שהתלמיד יגיע לבד.',
      'מדד העצמאות מראה למורה מי באמת פתר בעצמו ומי נעזר הרבה.',
      'מי שנתקע לא נשאר לבד מול המסך: הוא מרים יד, והמורה מגיע.',
    ],
  },
]

const partLabel = 'text-[13px] font-bold tracking-[.3px]'

export function ChallengesSection() {
  return (
    <section id="challenges" className={`${section} bg-nc-ground`}>
      <div className={wrap}>
        <SectionHead kicker="בלי לייפות" title="האתגרים שאנחנו פוגשים, ואיך אנחנו מתמודדים איתם">
          לשנות את מבנה הכיתה זה לא פשוט, ואנחנו לא מעמידים פנים שזה כן. אלה האתגרים שאנחנו והמורים
          פוגשים בשטח, ומה אנחנו עושים איתם.
        </SectionHead>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
          {CHALLENGES.map((ch) => (
            <article
              key={ch.title}
              className="flex flex-col gap-[18px] rounded-3xl border border-nc-line bg-nc-paper p-8"
            >
              <h3 className="font-nc-display text-2xl font-bold">{ch.title}</h3>
              <div className="flex flex-col gap-1.5">
                <span className={`${partLabel} text-nc-student-deep`}>האתגר</span>
                <p className="text-nc-ink-2">{ch.problem}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={`${partLabel} text-nc-brand-deep`}>מה אנחנו עושים</span>
                <ul className="flex flex-col gap-2">
                  {ch.answers.map((answer, i) => (
                    <li key={i} className="flex gap-2.5">
                      <i className="flex-none font-bold text-nc-brand not-italic">✓</i>
                      <span>{answer}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

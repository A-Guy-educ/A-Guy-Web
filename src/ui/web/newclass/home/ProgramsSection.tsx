import Link from 'next/link'

import { btn, section, tag, wrap } from '../newclassStyles'
import { SectionHead } from '../SectionHead'

interface Program {
  name: string
  kind: string
  oneLiner: string
  checks: string[]
  href: string
  cta: string
  theme: { card: string; title: string; tag: string; check: string; button: string }
}

const PROGRAMS: Program[] = [
  {
    name: 'Aguy לבית הספר',
    kind: 'טכנולוגיה',
    oneLiner: 'כל תלמיד ניגש לחומר בעצמו, ופונה למורה רק כשהוא באמת צריך.',
    checks: [
      'מורה דיגיטלי מבוסס בינה מלאכותית, מעל 1000 שיעורים במתמטיקה לכיתות ז׳–י״ב, לפי רמות ושאלוני הבגרות',
      'דשבורד למורה עם ציון ומדד עצמאות לכל תלמיד',
      'הכיתה עובדת במקביל: לבד, בזוגות ובקבוצות עם המורה',
    ],
    href: '/newclass/aguy',
    cta: 'פרטים נוספים על Aguy לבית הספר',
    theme: {
      card: 'bg-nc-aguy-bg',
      title: 'text-nc-teacher-deep',
      tag: 'bg-nc-teacher-tint text-nc-teacher-deep',
      check: 'text-nc-teacher-deep',
      button: btn.teacher,
    },
  },
  {
    name: 'לומדים ללמד',
    kind: 'אנשים',
    oneLiner: 'תלמידים בוגרים עוברים הכשרה, והופכים לתומכי הוראה שעוזרים למורים בזמן השיעור.',
    checks: [
      '30 שבועות של קורסים והתנסות בכיתות',
      'שעתיים שבועיות, בתוך מערכת השעות',
      'כל המשתתפים מסיימים כתומכי הוראה',
    ],
    href: '/newclass/lomdim',
    cta: 'פרטים נוספים על לומדים ללמד',
    theme: {
      card: 'bg-nc-lomdim-bg',
      title: 'text-nc-student-deep',
      tag: 'bg-nc-student-tint text-nc-student-deep',
      check: 'text-nc-student',
      button: btn.student,
    },
  },
]

export function ProgramsSection() {
  return (
    <section id="programs" className={`${section} bg-nc-paper`}>
      <div className={wrap}>
        <SectionHead kicker="התוכניות שלנו" title="שתי תוכניות שקוראות תיגר על הסדר הישן">
          שתיהן יוצאות מאותה הנחה: מורה אחד לא יכול להגיע לבד ל-40 תלמידים. A-guy עושה את זה דרך
          טכנולוגיה, לומדים ללמד דרך אנשים. כל תוכנית עומדת בפני עצמה, ובית הספר בוחר אחת מהן או את
          שתיהן.
        </SectionHead>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-content-gap-lg">
          {PROGRAMS.map((p) => (
            <article
              key={p.name}
              className={`flex flex-col gap-5 rounded-3xl border border-nc-line p-7 sm:p-10 ${p.theme.card}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={`font-nc-display text-[34px] font-extrabold ${p.theme.title}`}>
                  {p.name}
                </h3>
                <span className={`${tag} ${p.theme.tag}`}>{p.kind}</span>
              </div>
              <p className="text-[19px] leading-[1.6] font-medium">{p.oneLiner}</p>
              <ul className="flex flex-col gap-3 text-nc-ink-2">
                {p.checks.map((c) => (
                  <li key={c} className="flex gap-content-gap-xs.5">
                    <b className={`font-bold ${p.theme.check}`}>✓</b>
                    {c}
                  </li>
                ))}
              </ul>
              <Link className={`${p.theme.button} mt-1.5 self-start`} href={p.href}>
                {p.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

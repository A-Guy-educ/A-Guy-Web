import Link from 'next/link'

import { ContactButton } from '../contact/ContactButton'
import { btn, section, wrap } from '../newclassStyles'
import { SectionHead } from '../SectionHead'

// Content: the boss's "ללמוד ללמד" page (the program keeps its site name, לומדים ללמד).
// Tutor = brand, learner = student, teacher = teacher tones, as in the rest of /newclass.

const FACTS = [
  { value: '30 שבועות', label: 'קורסים והתנסות בכיתות', border: 'border-s-nc-brand' },
  {
    value: 'תומכי הוראה',
    label: 'כל המשתתפים מסיימים כתומכי הוראה',
    border: 'border-s-nc-student',
  },
  {
    value: 'שעתיים שבועיות',
    label: 'הכשרה והתנסות, בתוך מערכת השעות',
    border: 'border-s-nc-teacher',
  },
]

const BENEFITS = [
  {
    title: 'התלמיד המלמד',
    points: ['הבנה עמוקה של החומר, דרך הוראה', 'ביטחון עצמי, אחריות ויכולת להוביל'],
    tone: { card: 'bg-nc-brand-tint', title: 'text-nc-brand-deep', dot: 'bg-nc-brand' },
  },
  {
    title: 'התלמיד הלומד',
    points: ['מישהו שעוזר לו ברגע שהוא נתקע', 'מקום לשאול, לטעות ולהתקדם'],
    tone: { card: 'bg-nc-student-tint', title: 'text-nc-student-deep', dot: 'bg-nc-student' },
  },
  {
    title: 'המורה',
    points: ['לא לבד מול הכיתה', 'פנוי למי שהכי צריך אותו'],
    tone: { card: 'bg-nc-teacher-tint', title: 'text-nc-teacher-deep', dot: 'bg-nc-teacher' },
  },
]

const STEPS = [
  {
    when: '30 שבועות',
    title: 'הכשרה מקצועית',
    body: 'תלמידים בוגרים. שילוב של למידה והתנסות מעשית בכיתות, בשיטה שפיתחנו.',
  },
  {
    when: 'בסיום ההכשרה',
    title: 'כניסה לכיתות',
    body: 'התלמידים נכנסים לכיתות, בהתאם לצרכים של בית הספר.',
  },
  {
    when: 'מכאן והלאה, וגם בשנה הבאה',
    title: 'תומכי הוראה בבית הספר',
    body: 'לבית הספר יש צוות של תלמידים שהוכשרו לתמוך במורים בזמן השיעור.',
  },
]

const RESULTS = [
  {
    title: 'עלייה בציונים',
    body: 'במהלך ההתנסות ראינו שיפור בהישגים.',
    border: 'border-t-nc-brand',
  },
  {
    title: 'ביטחון ומסוגלות',
    body: 'התלמידים העזו לשאול, להסביר ולהתנסות.',
    border: 'border-t-nc-student',
  },
  {
    title: 'אחריות ואמפתיה',
    body: 'המלמדים גילו מחויבות להתקדמות של תלמיד אחר.',
    border: 'border-t-nc-teacher',
  },
]

const CONTACT = {
  name: 'איתי בן נבט',
  role: 'מנהל קשרי בתי ספר',
  email: 'guy@aguy.co.il',
  phone: '054-7446669',
  tel: '+972547446669',
}

const chip = 'rounded-full px-3.5 py-1.5 text-body-sm font-semibold'

export function LomdimHero() {
  return (
    <section className="bg-nc-sun pt-[72px] pb-20">
      <div className={`${wrap} flex flex-wrap items-center gap-12`}>
        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-5">
          <Link
            href="/newclass#programs"
            className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-nc-brand-deep no-underline"
          >
            → חזרה לעמוד הראשי
          </Link>
          <div className="flex flex-wrap gap-content-gap-xs">
            <span className={`${chip} border border-nc-brand-tint bg-nc-paper text-nc-brand-deep`}>
              לחטיבת הביניים ולתיכון
            </span>
            <span className={`${chip} bg-nc-student text-white`}>בקרוב בגפ״ן</span>
          </div>
          <h1 className="font-nc-display text-[clamp(44px,6vw,72px)] font-extrabold leading-[1.02] text-nc-brand-deep">
            לומדים ללמד
          </h1>
          <p className="font-nc-display text-[clamp(24px,2.8vw,32px)] font-bold leading-[1.3]">
            כדי להסביר בפשטות, צריך <span className="text-nc-student-deep">להבין לעומק</span>
          </p>
          <p className="max-w-[540px] text-[19px] text-nc-ink-2">
            תלמידים בוגרים עוברים הכשרה מקצועית, והופכים לתומכי הוראה שעוזרים למורים בזמן השיעור.
          </p>
        </div>
        <dl className="m-0 flex flex-[1_1_280px] flex-col gap-3">
          {FACTS.map((fact) => (
            <div
              key={fact.value}
              className={`rounded-[18px] border-s-[5px] bg-nc-paper px-5 py-section-xs ${fact.border}`}
            >
              <dt className="font-nc-display text-heading-xl font-extrabold">{fact.value}</dt>
              <dd className="m-0 text-nc-ink-2">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export function LomdimBenefits() {
  return (
    <section className={`${section} bg-nc-paper`}>
      <div className={wrap}>
        <SectionHead kicker="מי מרוויח" title="כולם מרוויחים. כל אחד בדרך שלו." />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-5">
          {BENEFITS.map((b) => (
            <article
              key={b.title}
              className={`flex flex-col gap-3 rounded-[22px] p-7 ${b.tone.card}`}
            >
              <h3 className={`font-nc-display text-heading-xl font-extrabold ${b.tone.title}`}>
                {b.title}
              </h3>
              <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
                {b.points.map((point) => (
                  <li key={point} className="flex items-start gap-[10px]">
                    <b className={`mt-2.5 size-2 flex-none rounded-full ${b.tone.dot}`} />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LomdimSteps() {
  return (
    <section className={section}>
      <div className={wrap}>
        <SectionHead kicker="איך זה עובד" title="מהכשרה, לתומכי הוראה בבית הספר" />
        <ol className="m-0 flex list-none flex-col gap-content-gap p-0">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-[10px] rounded-3xl bg-nc-paper p-card-padding"
            >
              <span className="self-start rounded-full bg-nc-brand px-3.5 py-1 font-nc-display text-body-sm font-bold text-white">
                {step.when}
              </span>
              <h3 className="font-nc-display text-[26px] font-extrabold">
                <span className="text-nc-brand">{i + 1}. </span>
                {step.title}
              </h3>
              <p className="max-w-[560px] text-nc-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
        <ContactButton
          className="mt-5 block w-full cursor-pointer rounded-2xl bg-nc-student-tint px-[22px] py-section-xs text-start font-nc-display text-body-lg font-bold text-nc-student-deep hover:underline"
          topic="לומדים ללמד"
        >
          איך בנויה ההכשרה, ומה עושים בכל שלב? נשמח להציג לכם את התוכנית המלאה ←
        </ContactButton>
      </div>
    </section>
  )
}

export function LomdimResults() {
  return (
    <section className={`${section} bg-nc-paper`}>
      <div className={wrap}>
        <SectionHead kicker="תוצאות מהשטח" title="התוכנית נתנה יותר ממה שציפינו" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
          {RESULTS.map((r) => (
            <div key={r.title} className={`flex flex-col gap-1.5 border-t-4 pt-[18px] ${r.border}`}>
              <h3 className="font-nc-display text-[21px] font-bold">{r.title}</h3>
              <p className="text-nc-ink-2">{r.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-7 text-[15px] text-nc-ink-soft">
          מתוך התנסות קודמת, שבה תלמידי כיתה י׳ לימדו תלמידי כיתה ט׳.
        </p>
      </div>
    </section>
  )
}

export function LomdimClose() {
  return (
    <section className="py-20">
      <div className={wrap}>
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-[26px] border-2 border-nc-brand bg-nc-paper p-7 sm:p-9">
          <div className="flex max-w-[620px] flex-col gap-3">
            <p className="font-nc-display text-[clamp(22px,2.6vw,30px)] font-extrabold leading-[1.35] text-nc-brand-deep">
              הכשרה שמיד הופכת לעשייה, ועשייה שחוזרת ללמידה.
            </p>
            <p className="text-body-lg">רוצים לשמוע איך זה עובד? נשמח להציג לכם את התוכנית.</p>
          </div>
          <div className="flex flex-col gap-1 text-body-md text-nc-ink-2">
            <ContactButton className={btn.brand} topic="לומדים ללמד">
              השאירו פרטים
            </ContactButton>
            <b className="mt-2 text-nc-ink">{CONTACT.name}</b>
            <span>{CONTACT.role}</span>
            <span>
              <a
                className="text-inherit underline underline-offset-[3px]"
                href={`mailto:${CONTACT.email}`}
              >
                {CONTACT.email}
              </a>
              {' · '}
              <a
                className="text-inherit underline underline-offset-[3px]"
                href={`tel:${CONTACT.tel}`}
              >
                <bdi>{CONTACT.phone}</bdi>
              </a>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

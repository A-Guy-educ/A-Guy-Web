import { ArrowLeft, Backpack, GraduationCap } from 'lucide-react'
import Link from 'next/link'

import { ContactButton } from '@/ui/web/newclass/contact/ContactButton'
import { card, eyebrow, h2, lead, wrap } from '@/ui/web/newclass/newclassStyles'

// Entry point from the /newclass landing. Students go through /join (school +
// class + Google sign-in); teachers sign in and are routed to the teacher app
// by /classdemo/teacher, which checks their role.
const ROLES = [
  {
    href: '/join',
    title: 'אני תלמיד/ה',
    body: 'בוחרים בית ספר וכיתה, מתחברים עם Google ומתחילים ללמוד.',
    cta: 'כניסה לתלמידים',
    Icon: Backpack,
    tone: 'bg-nc-student-tint text-nc-student-deep',
    accent: 'text-nc-student-deep',
  },
  {
    href: '/classdemo/teacher',
    title: 'אני מורה',
    body: 'מתחברים לחשבון המורה ועוברים למרחב המורה: תמונת מצב של הכיתה והתקדמות התלמידים.',
    cta: 'כניסה למורים',
    Icon: GraduationCap,
    tone: 'bg-nc-teacher-tint text-nc-teacher-deep',
    accent: 'text-nc-teacher-deep',
  },
] as const

export function ClassRolePicker() {
  return (
    <section className="bg-nc-sun py-section-lg sm:py-section-xl">
      <div className={`${wrap} flex max-w-[880px] flex-col gap-content-gap-xl`}>
        <div className="flex flex-col gap-3">
          <span className={eyebrow}>כניסה / הרשמה</span>
          <h1 className={h2}>מצטרפים לכיתה החדשה</h1>
          <p className={lead}>בחרו איך אתם נכנסים. אם כבר יש לכם חשבון, פשוט תתחברו.</p>
        </div>
        <div className="grid gap-content-gap sm:grid-cols-2">
          {ROLES.map(({ href, title, body, cta, Icon, tone, accent }) => (
            <Link
              key={href}
              href={href}
              className={`${card} group flex flex-col gap-content-gap border border-nc-line p-card-padding text-nc-ink no-underline transition-colors hover:border-nc-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nc-brand-light sm:p-card-padding-lg`}
            >
              <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}>
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span className="font-nc-display text-heading-xl font-extrabold">{title}</span>
              <span className="text-nc-ink-2">{body}</span>
              <span
                className={`mt-auto inline-flex items-center gap-content-gap-xs font-semibold ${accent}`}
              >
                {cta}
                <ArrowLeft
                  className="size-4 transition-transform group-hover:-translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
        <p className="text-body-md text-nc-ink-2">
          חשבונות מורה נפתחים על ידי צוות A-guy עבור בית הספר. עוד אין לכם חשבון?{' '}
          <ContactButton className="cursor-pointer font-semibold text-nc-brand-deep underline">
            דברו איתנו
          </ContactButton>
        </p>
      </div>
    </section>
  )
}

import Link from 'next/link'

import { ContactButton } from '@/ui/web/newclass/contact/ContactButton'
import { btn, card, h2, lead, wrap } from '@/ui/web/newclass/newclassStyles'

// Shown on /classdemo/teacher to a signed-in user whose account has no teacher
// role, instead of sending them to the teacher app only to be turned away there.
export function NotTeacherNotice() {
  return (
    <section className="bg-nc-sun py-section-lg sm:py-section-xl">
      <div className={`${wrap} max-w-[720px]`}>
        <div
          className={`${card} flex flex-col gap-content-gap border border-nc-line p-card-padding sm:p-10`}
        >
          <h1 className={h2}>החשבון הזה אינו חשבון מורה</h1>
          <p className={lead}>
            מרחב המורה פתוח רק לחשבונות שצוות A-guy הגדיר כמורים. אם אתם מורים בבית ספר שעובד איתנו,
            דברו איתנו ונפתח לכם גישה. תלמידים נכנסים דרך דף ההצטרפות לכיתה.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ContactButton className={btn.brand}>בקשת גישת מורה</ContactButton>
            <Link className={btn.ghost} href="/join">
              הצטרפות לכיתה כתלמיד/ה
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

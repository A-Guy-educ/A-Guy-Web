import type { Metadata } from 'next'
import Link from 'next/link'

import { pageMetadata } from '@/infra/seo/pageMetadata'
import { AguyShowcase } from '@/ui/web/newclass/aguy/AguyShowcase'
import { AguyCurriculum, AguyDashboardFeatures } from '@/ui/web/newclass/aguy/AguyDetails'
import { AguyTrySection } from '@/ui/web/newclass/aguy/AguyTrySection'
import { ContactButton } from '@/ui/web/newclass/contact/ContactButton'
import { btn, section, wrap } from '@/ui/web/newclass/newclassStyles'
import {
  PlaceholderGallery,
  PriceCard,
  StepList,
  ViewHero,
  ViewSection,
} from '@/ui/web/newclass/program/ProgramBlocks'
import { SectionHead } from '@/ui/web/newclass/SectionHead'

const LESSON_STEPS = [
  { title: 'התלמיד נכנס לנושא', body: 'פותח את השיעור באתר, מכל מחשב או טלפון, בלי התקנה.' },
  {
    title: 'לומד ומתרגל עם A-guy',
    body: 'הסבר, שאלות מכוונות ותרגילים, בטקסט ובקול. A-guy לא פותר במקומו.',
  },
  { title: 'נתקע? מרים יד', body: 'המורה רואה בדשבורד מי צריך אותו, ומגיע אליו.' },
]

const IMPLEMENT_STEPS = [1, 2, 3, 4].map((n) => ({
  title: `[שלב ${n}: שם השלב]`,
  body: '[מה קורה בשלב, מי מעורב וכמה זמן זה לוקח]',
}))

export default function AguyProgramPage() {
  return (
    <>
      <ViewHero
        kicker="תוכנית A-guy"
        title="מורה דיגיטלי למתמטיקה, ותהליך הטמעה שמביא אותו לכיתה"
        actions={
          <>
            <ContactButton className={btn.brand} topic="A-guy">
              השאירו פרטים
            </ContactButton>
            <Link className={btn.ghost} href="#try">
              נסו שיחה לדוגמה
            </Link>
          </>
        }
      >
        A-guy מלווה כל תלמיד בקצב שלו, עם הסברים, שאלות מכוונות ותרגול. המורה רואה בזמן אמת מי מתקדם
        ומי צריך אותו. ואנחנו מלווים את בית הספר עד שהשיעור החדש עובד.
      </ViewHero>
      <AguyShowcase />
      <ViewSection alt>
        <PlaceholderGallery
          items={[
            '[תמונה: תלמידים עובדים עם A-guy בכיתה]',
            '[צילום מסך: שיעור באתר]',
            '[צילום מסך: דשבורד המורה]',
          ]}
        />
      </ViewSection>
      <ViewSection title="איך זה עובד בשיעור">
        <StepList steps={LESSON_STEPS} />
      </ViewSection>
      <AguyTrySection />
      <section id="implement" className={section}>
        <div className={wrap}>
          <SectionHead kicker="תהליך ההטמעה של A-guy" title="A-guy לא נכנס לבית הספר לבד">
            מורה AI אפשר לקנות בכמה קליקים. לשנות את מבנה השיעור לוקח תהליך. אנחנו מלווים את בית
            הספר והמורים צעד אחר צעד, עד שהכיתה החדשה עובדת.
          </SectionHead>
          <StepList steps={IMPLEMENT_STEPS} />
        </div>
      </section>
      <AguyCurriculum />
      <AguyDashboardFeatures />
      <ViewSection title="מחיר" alt>
        <PriceCard
          lines={[
            '[למה המחיר מתייחס: לכיתה, לתלמיד או לשנה]',
            'כולל תהליך הטמעה מלא. [פירוט מה כלול]',
            '[רכישה דרך גפ"ן: לעדכן אחרי אישור]',
          ]}
          action={
            <ContactButton className={btn.brand} topic="A-guy">
              השאירו פרטים
            </ContactButton>
          }
        />
      </ViewSection>
    </>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'A-guy · הכיתה החדשה 3D',
    description:
      'מורה דיגיטלי למתמטיקה לכיתות ז׳–י״ב, דשבורד עם מדד עצמאות למורה, ותהליך הטמעה מלא בבית הספר.',
  })
}

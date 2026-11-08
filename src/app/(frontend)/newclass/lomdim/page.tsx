import type { Metadata } from 'next'

import { pageMetadata } from '@/infra/seo/pageMetadata'
import { ContactButton } from '@/ui/web/newclass/contact/ContactButton'
import { btn } from '@/ui/web/newclass/newclassStyles'
import {
  PlaceholderGallery,
  PriceCard,
  StepList,
  ViewHero,
  ViewSection,
} from '@/ui/web/newclass/program/ProgramBlocks'

const BENEFITS = [
  { title: 'התלמידים', body: 'עזרה צמודה ממישהו קרוב לגילם, שמבין בדיוק איפה הם נתקעים.' },
  {
    title: 'החונכים',
    body: 'הבנה עמוקה יותר של החומר, אחריות, ניסיון בהוראה, והכרה בשעות מעורבות חברתית.',
  },
  { title: 'המורה ובית הספר', body: 'עוד ידיים בכיתה ובשעות הפרטניות, בלי תוספת שעות הוראה.' },
]

const PROGRAM_STEPS = [
  { title: 'בחירת החונכים', body: '[מי יכול להיות חונך, ואיך בוחרים]' },
  { title: 'הכשרה', body: '60 שעות פרונטליות עם מורה מוסמך. [מה לומדים בהכשרה]' },
  { title: 'ליווי בכיתה', body: 'החונכים נכנסים לשיעורים ולשעות הפרטניות. [את מי מלווים]' },
  { title: 'מעקב שוטף', body: '[איך מלווים את החונכים לאורך השנה]' },
]

const FACTS = [
  { label: 'הכשרה', value: '60 שעות פרונטליות' },
  { label: 'מכשיר', value: 'מורה מוסמך' },
  { label: 'חונכים בכל מחזור', value: '[מספר]' },
  { label: 'הכרה', value: 'שעות מעורבות חברתית' },
]

const leaveDetails = (
  <ContactButton className={btn.brand} topic="לומדים ללמד">
    השאירו פרטים
  </ContactButton>
)

export default function LomdimProgramPage() {
  return (
    <>
      <ViewHero
        kicker="תוכנית לומדים ללמד"
        title="בני נוער שמלמדים, ותלמידים שמקבלים יד מכוונת"
        actions={leaveDetails}
      >
        לומדים ללמד מכשירה בני נוער ללוות תלמידים אחרים, בכיתה ובשיעורים פרטניים. החונכים מעמיקים
        בחומר ומפתחים אחריות, התלמידים מקבלים עזרה צמודה, והמורה מקבל עוד ידיים בכיתה.
      </ViewHero>
      <ViewSection alt>
        <PlaceholderGallery
          items={['[תמונה: חונך עם קבוצת תלמידים]', '[תמונה: מפגש הכשרה]', '[תמונה: שיעור פרטני]']}
        />
      </ViewSection>
      <ViewSection title="מי מרוויח">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4">
          {BENEFITS.map((b) => (
            <article key={b.title} className="flex flex-col gap-2 rounded-[20px] bg-nc-ground p-6">
              <h3 className="font-nc-display text-xl font-bold">{b.title}</h3>
              <p className="text-base text-nc-ink-2">{b.body}</p>
            </article>
          ))}
        </div>
      </ViewSection>
      <ViewSection title="איך התוכנית בנויה" alt>
        <StepList steps={PROGRAM_STEPS} />
      </ViewSection>
      <ViewSection title="בקצרה">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
          {FACTS.map((f) => (
            <div
              key={f.label}
              className="flex flex-col gap-1 rounded-2xl border border-nc-line bg-nc-paper p-[18px]"
            >
              <b className="text-sm font-semibold text-nc-ink-2">{f.label}</b>
              <span className="text-lg font-semibold">{f.value}</span>
            </div>
          ))}
        </div>
      </ViewSection>
      <ViewSection title="מחיר" alt>
        <PriceCard
          lines={[
            '[למה המחיר מתייחס: למחזור, לבית ספר או לחונך]',
            '[מה כלול]',
            '[רכישה דרך גפ"ן: לעדכן אחרי אישור]',
          ]}
          action={leaveDetails}
        />
      </ViewSection>
    </>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'לומדים ללמד · הכיתה החדשה 3D',
    description:
      'בני נוער שעוברים 60 שעות הכשרה עם מורה מוסמך ומלווים תלמידים בכיתה ובשיעורים פרטניים.',
  })
}

import type { Metadata } from 'next'

import { pageMetadata } from '@/infra/seo/pageMetadata'
import { AguyShowcase } from '@/ui/web/newclass/aguy/AguyShowcase'
import { ImplementationProcess } from '@/ui/web/newclass/aguy/ImplementationProcess'
import { ContactButton } from '@/ui/web/newclass/contact/ContactButton'
import { btn } from '@/ui/web/newclass/newclassStyles'
import { ViewHero } from '@/ui/web/newclass/program/ProgramBlocks'

export default function AguyProgramPage() {
  return (
    <>
      <ViewHero
        kicker="Aguy לבית הספר"
        title="מורה דיגיטלי למתמטיקה, ותהליך הטמעה שמביא אותו לכיתה"
        actions={
          <ContactButton className={btn.brand} topic="Aguy לבית הספר">
            השאירו פרטים
          </ContactButton>
        }
      >
        A-guy מלווה כל תלמיד בקצב שלו, עם הסברים, שאלות מכוונות ותרגול. המורה רואה בזמן אמת מי מתקדם
        ומי צריך אותו. ואנחנו מלווים את בית הספר עד שהשיעור החדש עובד.
      </ViewHero>
      <AguyShowcase />
      <ImplementationProcess />
    </>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Aguy לבית הספר · הכיתה החדשה 3D',
    description:
      'מורה דיגיטלי למתמטיקה לכיתות ז׳–י״ב, ותהליך הטמעה מלא שבו אנחנו מלווים את המורים עד שהכיתה עובדת.',
  })
}

import { redirect } from 'next/navigation'
import { getMeUser } from '@/infra/utils/getMeUser'
import { formatIsraeliPhone, isWhatsAppPlaceholderEmail } from '@/infra/whatsapp/phone'
import { getUserClassPlacement } from '@/server/services/classroom/user-class-placement'
import { MePageContent } from './MePageContent'

export const metadata = { title: 'Personal details' }

export default async function MePage() {
  const { user } = await getMeUser()

  if (!user) {
    redirect('/login')
  }

  const { className, schoolName } = await getUserClassPlacement(user.id)

  // Only /join collects first and last name; everyone else just has `name`.
  return (
    <MePageContent
      details={{
        firstName: user.firstName || user.name,
        lastName: user.lastName,
        className,
        school: schoolName,
        phone: user.phone ?? (user.verifiedPhone ? formatIsraeliPhone(user.verifiedPhone) : null),
        email: isWhatsAppPlaceholderEmail(user.email) ? null : user.email,
      }}
    />
  )
}

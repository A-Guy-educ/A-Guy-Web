import { redirect } from 'next/navigation'
import { getMeUser } from '@/infra/utils/getMeUser'
import { isPasswordLoginEnabled } from '@/infra/config/system-params'
import { LoginPageContent } from './LoginPageContent'

export const metadata = { title: 'Log In' }

export default async function LoginPage() {
  const { user } = await getMeUser()

  if (user) {
    redirect('/')
  }

  const passwordEnabled = await isPasswordLoginEnabled()

  return <LoginPageContent passwordEnabled={passwordEnabled} />
}

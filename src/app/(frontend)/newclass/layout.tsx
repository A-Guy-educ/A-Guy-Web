import { Rubik } from 'next/font/google'
import type { ReactNode } from 'react'

import { ContactDialogProvider } from '@/ui/web/newclass/contact/ContactDialogProvider'
import { NewClassFooter } from '@/ui/web/newclass/NewClassFooter'
import { NewClassHeader } from '@/ui/web/newclass/NewClassHeader'

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['500', '700', '800'],
  variable: '--font-rubik',
  display: 'swap',
})

// "The New Classroom 3D" is a Hebrew-only, light-only marketing site, so it
// pins its own direction and palette regardless of the visitor's locale/theme.
export default function NewClassLayout({ children }: { children: ReactNode }) {
  return (
    <div
      dir="rtl"
      lang="he"
      className={`${rubik.variable} min-h-screen bg-nc-ground text-start font-nc-body text-[17px] leading-[1.65] text-nc-ink [color-scheme:light]`}
    >
      <ContactDialogProvider>
        <NewClassHeader />
        <main>{children}</main>
        <NewClassFooter />
      </ContactDialogProvider>
    </div>
  )
}

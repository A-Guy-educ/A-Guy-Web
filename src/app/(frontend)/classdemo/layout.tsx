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

// The sign-in / sign-up step after the /newclass landing, so it wears the same
// Hebrew-only, light-only chrome as that site.
export default function ClassDemoLayout({ children }: { children: ReactNode }) {
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

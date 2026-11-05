import type { ReactNode } from 'react'

import { eyebrow, h2, lead } from './newclassStyles'

interface SectionHeadProps {
  kicker: string
  title: ReactNode
  children?: ReactNode
}

export function SectionHead({ kicker, title, children }: SectionHeadProps) {
  return (
    <div className="mb-12 flex max-w-[720px] flex-col gap-3.5">
      <span className={eyebrow}>{kicker}</span>
      <h2 className={h2}>{title}</h2>
      {children ? <p className={lead}>{children}</p> : null}
    </div>
  )
}

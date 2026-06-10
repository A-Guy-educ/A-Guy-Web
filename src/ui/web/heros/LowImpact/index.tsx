import React from 'react'

import type { Hero } from '@/infra/types/content'

import RichText from '@/ui/web/RichText'

type LowImpactHeroType =
  | {
      children?: React.ReactNode
      richText?: never
    }
  | (Omit<Hero, 'richText'> & {
      children?: never
      richText?: Hero['richText']
    })

export const LowImpactHero: React.FC<LowImpactHeroType> = ({ children, richText }) => {
  return (
    <div className="container mt-section-md">
      <div className="max-w-[48rem]">
        {children || (Boolean(richText) && <RichText data={richText} enableGutter={false} />)}
      </div>
    </div>
  )
}

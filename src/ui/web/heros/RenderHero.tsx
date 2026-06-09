import React from 'react'

import type { Page } from '@/infra/types/content'

import { HighImpactHero } from '@/ui/web/heros/HighImpact'
import { LowImpactHero } from '@/ui/web/heros/LowImpact'
import { MediumImpactHero } from '@/ui/web/heros/MediumImpact'

const heroes = {
  highImpact: HighImpactHero,
  lowImpact: LowImpactHero,
  mediumImpact: MediumImpactHero,
}

export const RenderHero: React.FC<Page['hero']> = (props) => {
  const { type } = props || {}

  if (!type || type === 'none') return null

  const HeroToRender = heroes[type as keyof typeof heroes]

  if (!HeroToRender) return null

  return <HeroToRender {...props} />
}

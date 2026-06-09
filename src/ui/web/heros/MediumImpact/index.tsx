import React from 'react'

import type { Hero } from '@/infra/types/content'

import { CMSLink } from '@/ui/web/Link'
import RichText from '@/ui/web/RichText'

export const MediumImpactHero: React.FC<Hero> = ({ links, richText }) => {
  return (
    <div className="py-section-sm">
      <div className="container mb-content-gap-lg">
        {Boolean(richText) && (
          <RichText className="mb-content-gap" data={richText} enableGutter={false} />
        )}

        {Array.isArray(links) && links.length > 0 && (
          <ul className="flex gap-content-gap">
            {(links as Array<{ link: any }>).map(({ link }, i) => {
              return (
                <li key={i}>
                  <CMSLink {...link} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

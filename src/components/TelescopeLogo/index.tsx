import Image from 'next/image'
import telescopeSvg from './telescope.svg'
import React from 'react'

interface TelescopeLogoProps {
  className?: string
}

export function TelescopeLogo({ className }: TelescopeLogoProps) {
  return (
    <Image
      src={telescopeSvg}
      alt="Telescope Logo"
      className={className}
      width={224}
      height={204}
      priority
    />
  )
}

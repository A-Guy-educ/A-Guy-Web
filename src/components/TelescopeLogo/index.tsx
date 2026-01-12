'use client'

import { useTheme } from '@/providers/Theme'
import React, { useEffect, useState } from 'react'

import { TelescopeLogoDark } from './TelescopeLogoDark'
import { TelescopeLogoLight } from './TelescopeLogoLight'

interface TelescopeLogoProps {
  className?: string
}

function getThemeFromDOM(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  const theme = document.documentElement.getAttribute('data-theme')
  return theme === 'dark' ? 'dark' : 'light'
}

export function TelescopeLogo({ className }: TelescopeLogoProps) {
  const { theme } = useTheme()
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() =>
    theme ? theme : getThemeFromDOM(),
  )

  useEffect(() => {
    const resolvedTheme = theme || getThemeFromDOM()
    setCurrentTheme(resolvedTheme)
  }, [theme])

  if (currentTheme === 'dark') {
    return <TelescopeLogoDark className={className} />
  }

  return <TelescopeLogoLight className={className} />
}

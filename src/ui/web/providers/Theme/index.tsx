'use client'

import {
  ThemeProvider as SharedThemeProvider,
  useTheme as useSharedTheme,
  type Theme,
  type ThemeChoice,
} from '@a-guy/ui'
import { createContext, use, type ReactNode } from 'react'

interface CompatibleThemeContext {
  choice: ThemeChoice
  theme?: Theme
  setTheme: (theme: Theme | null) => void
}

const ThemeContext = createContext<CompatibleThemeContext>({
  choice: 'auto',
  theme: undefined,
  setTheme: () => undefined,
})

function ThemeBridge({ children }: { children: ReactNode }) {
  const { choice, resolvedTheme, setTheme: setSharedTheme } = useSharedTheme()

  return (
    <ThemeContext
      value={{
        choice,
        theme: resolvedTheme,
        setTheme: (theme) => setSharedTheme(theme ?? 'auto'),
      }}
    >
      {children}
    </ThemeContext>
  )
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <SharedThemeProvider>
      <ThemeBridge>{children}</ThemeBridge>
    </SharedThemeProvider>
  )
}

export function useTheme(): CompatibleThemeContext {
  return use(ThemeContext)
}

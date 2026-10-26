'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/infra/utils/ui'
import { Check } from 'lucide-react'

// Theme values for each preset live in `src/app/(frontend)/accents.css`,
// keyed by `id`. `swatch` is only the circle shown in the picker.
// Order matters: the saved preference is the preset's index.
export const ACCENT_PRESETS = [
  { id: 'burgundy', name: 'Burgundy', swatch: 'hsl(353 73% 29%)' }, // default
  { id: 'ocean', name: 'Ocean', swatch: 'hsl(217 91% 40%)' },
  { id: 'forest', name: 'Forest', swatch: 'hsl(142 71% 35%)' },
  { id: 'sunset', name: 'Sunset', swatch: 'hsl(25 95% 43%)' },
  { id: 'violet', name: 'Violet', swatch: 'hsl(271 91% 45%)' },
  { id: 'rose', name: 'Rose', swatch: 'hsl(330 81% 40%)' },
] as const

const STORAGE_KEY = 'aguy-accent-color'

function getStoredAccent(): number {
  if (typeof window === 'undefined') return 0
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? parseInt(stored, 10) : 0
}

function applyAccent(index: number) {
  const preset = ACCENT_PRESETS[index]
  if (!preset) return

  // A data attribute instead of inline custom properties, so the CSS can pick
  // the light or dark value for the current theme.
  const root = document.documentElement
  if (index === 0) {
    delete root.dataset.accent
  } else {
    root.dataset.accent = preset.id
  }

  localStorage.setItem(STORAGE_KEY, String(index))
}

export function AccentPicker({ className }: { className?: string }) {
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    const stored = getStoredAccent()
    setSelected(stored)
    if (stored !== 0) {
      applyAccent(stored)
    }
  }, [])

  const handleSelect = (index: number) => {
    setSelected(index)
    applyAccent(index)
  }

  return (
    <div className={cn('flex items-center gap-content-gap-xs', className)}>
      {ACCENT_PRESETS.map((preset, i) => (
        <button
          key={preset.name}
          onClick={() => handleSelect(i)}
          className={cn(
            'w-8 h-8 rounded-full border-2 transition-all duration-normal',
            'hover:scale-110 active:scale-95',
            selected === i ? 'border-foreground scale-110' : 'border-transparent',
          )}
          style={{ backgroundColor: preset.swatch }}
          title={preset.name}
          aria-label={`${preset.name} accent color`}
        >
          {selected === i && <Check className="w-4 h-4 text-white mx-auto" />}
        </button>
      ))}
    </div>
  )
}

// Call this on app init to restore saved accent
export function restoreAccent() {
  if (typeof window === 'undefined') return
  const stored = getStoredAccent()
  if (stored !== 0) {
    applyAccent(stored)
  }
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ConvertButtonProps {
  lessonId: string
}

export function ConvertButton({ lessonId }: ConvertButtonProps) {
  const router = useRouter()
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConvert = async () => {
    setIsConverting(true)
    setError(null)

    try {
      const response = await fetch(`/api/exercises/import?lessonId=${lessonId}`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert image')
      }

      // Success! Refresh the page to show the new exercise
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsConverting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleConvert}
        disabled={isConverting}
        className="inline-flex items-center px-6 py-3 bg-gradient-to-br from-primary to-accent text-primary-foreground border-0 rounded-xl font-semibold text-base cursor-pointer transition-all duration-300 shadow-[0_4px_6px_hsl(var(--primary)/0.25)] hover:translate-y-[-2px] hover:shadow-[0_6px_12px_hsl(var(--primary)/0.35)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isConverting ? '🔄 Converting...' : '🪄 Convert to Exercise (AI)'}
      </button>

      {error && (
        <div className="px-4 py-3 bg-destructive/10 text-destructive rounded-lg text-sm text-center max-w-[400px]">
          {error}
        </div>
      )}
    </div>
  )
}

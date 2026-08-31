/**
 * @fileType hook
 * @domain lessons
 * @ai-summary Hebrew TTS narration for chat lessons. Calls our
 *             `/api/tts/synthesize` endpoint (Google Cloud TTS,
 *             `he-IL-Neural2-A`) and plays the returned base64 MP3
 *             through an <Audio> element. On network error / timeout
 *             / decode failure we stay silent — the browser's built-in
 *             Hebrew voices are worse than nothing, so we do not fall
 *             back to `window.speechSynthesis`. Public API:
 *             `speak(text)`, `cancel()`, `toggleMuted()`, plus
 *             `supported`/`speaking`/`muted` state.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// If the API doesn't return in this budget, give up and stay silent so the
// user isn't stuck waiting. Google Cloud TTS is typically sub-second; give
// generous headroom for a slow network before we abandon the request.
const TTS_TIMEOUT_MS = 6000

function stripForSpeech(text: string): string {
  return (
    text
      // KaTeX inline math delimiters
      .replace(/\$([^$]+)\$/g, '$1')
      .replace(/\$\$([^$]+)\$\$/g, '$1')
      // stray markdown
      .replace(/[*_`~#]/g, '')
      // HTML tags if any leaked in
      .replace(/<[^>]+>/g, '')
      .trim()
  )
}

export function useBrowserTTS() {
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)
  // Track the in-flight cloud request + audio element so `cancel()` and
  // subsequent `speak()` calls can tear them down cleanly. Playing a new
  // line while the previous is loading should silently supersede it.
  const abortRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopAudio = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      // Detach handlers before mutating src so their `audio === audioRef.current`
      // guards don't fire on our own teardown.
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Fetch + Audio are universal — safe to assume any browser we care
    // about supports this path.
    setSupported(true)

    return () => {
      abortRef.current?.abort()
      abortRef.current = null
      stopAudio()
    }
  }, [stopAudio])

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    stopAudio()
    setSpeaking(false)
  }, [stopAudio])

  const speak = useCallback(
    (text: string) => {
      if (!supported || muted || !text) return
      const clean = stripForSpeech(text)
      if (!clean) return

      // Tear down anything from the previous line.
      cancel()

      const controller = new AbortController()
      abortRef.current = controller
      const timeoutId = window.setTimeout(() => {
        controller.abort()
      }, TTS_TIMEOUT_MS)

      setSpeaking(true)

      fetch('/api/tts/synthesize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, locale: 'he' }),
        signal: controller.signal,
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`TTS HTTP ${r.status}`)
          const { audioContent } = (await r.json()) as { audioContent?: string }
          if (!audioContent) throw new Error('TTS empty audioContent')
          return audioContent
        })
        .then((audioContent) => {
          window.clearTimeout(timeoutId)
          // If a newer speak() has already replaced our controller, drop.
          if (abortRef.current !== controller) return
          const audio = new Audio(`data:audio/mp3;base64,${audioContent}`)
          audioRef.current = audio
          audio.onended = () => {
            if (audioRef.current === audio) {
              stopAudio()
              setSpeaking(false)
            }
          }
          audio.onerror = () => {
            if (audioRef.current === audio) {
              stopAudio()
              setSpeaking(false)
            }
          }
          void audio.play().catch(() => {
            // Autoplay policy or other play() rejection — stay silent.
            if (audioRef.current === audio) {
              stopAudio()
              setSpeaking(false)
            }
          })
        })
        .catch(() => {
          window.clearTimeout(timeoutId)
          if (abortRef.current !== controller) return
          abortRef.current = null
          // Cloud TTS unreachable / timed out / non-OK / user cancel —
          // stay silent. Browser fallback is worse than nothing.
          setSpeaking(false)
        })
    },
    [cancel, muted, stopAudio, supported],
  )

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      if (next) cancel()
      return next
    })
  }, [cancel])

  return { supported, muted, speaking, speak, cancel, toggleMuted }
}

'use client'

import { useEffect, useRef, useState } from 'react'

type RecognitionCtor = new () => SpeechRecognition

/**
 * The demo's mic button: browser dictation that drops what was said into the
 * composer. Browsers without speech recognition get `onUnavailable` instead.
 */
export function useDictation({
  locale,
  onText,
  onUnavailable,
  onFailed,
}: {
  locale: 'en' | 'he'
  onText: (text: string) => void
  onUnavailable: () => void
  onFailed: () => void
}) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const handlers = useRef({ onText, onFailed })
  useEffect(() => {
    handlers.current = { onText, onFailed }
  })

  useEffect(() => {
    // Not on TS's Window type; Safari and older Chrome only have the prefixed one.
    const w = window as Window & {
      SpeechRecognition?: RecognitionCtor
      webkitSpeechRecognition?: RecognitionCtor
    }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.lang = locale === 'he' ? 'he-IL' : 'en-US'
    recognition.interimResults = false
    recognition.onresult = (event) => handlers.current.onText(event.results[0][0].transcript)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => {
      setListening(false)
      handlers.current.onFailed()
    }
    recognitionRef.current = recognition
    return () => {
      recognition.onend = null
      recognition.onerror = null
      recognition.stop()
      recognitionRef.current = null
    }
  }, [locale])

  const toggle = () => {
    const recognition = recognitionRef.current
    if (!recognition) {
      onUnavailable()
      return
    }
    try {
      recognition.start()
      setListening(true)
    } catch {
      // Already listening: a second press stops it.
      recognition.stop()
    }
  }

  return { listening, toggle }
}

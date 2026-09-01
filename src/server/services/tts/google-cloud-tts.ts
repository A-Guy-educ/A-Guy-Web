/**
 * Google Cloud Text-to-Speech service.
 *
 * Voice + speaking-rate come from Admin's public `/api/tts-settings/current`
 * global (60s in-process cache matches the admin CDN s-maxage so voice
 * changes propagate within ~1 min without hammering the endpoint).
 */

import { z } from 'zod'
import { logger } from '@/infra/utils/logger'
import { isConfigLoaded, getSecret } from '@/infra/config/runtime/runtime-config'
import type { Payload } from '@/infra/types/backend'

export const synthesizeRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  locale: z.enum(['en', 'he']),
})

export type SynthesizeRequest = z.infer<typeof synthesizeRequestSchema>

const TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'

// TTS uses its own API key because Google Cloud API-key restrictions can't
// cover both Generative Language (Gemini) and Cloud Text-to-Speech on a single
// key — the console rejects the combination. Provision a separate key
// restricted to the Cloud Text-to-Speech API and expose it as
// GOOGLE_TTS_API_KEY.
async function getApiKey(payload?: Payload): Promise<string> {
  if (payload && !isConfigLoaded()) {
    const { loadRuntimeConfig } = await import('@/infra/config/runtime/runtime-config')
    await loadRuntimeConfig(payload)
  }

  try {
    const secret = getSecret('GOOGLE_TTS_API_KEY', { throwIfNotFound: false })
    if (secret) return secret
  } catch {
    // ConfigSecrets not available, fall through to env
  }

  const envValue = process.env.GOOGLE_TTS_API_KEY
  if (!envValue) {
    throw new Error('[TTS] GOOGLE_TTS_API_KEY not found in ConfigSecrets or environment')
  }
  return envValue
}

// ---------------------------------------------------------------------------
// Admin-driven voice settings (fetched from A-Guy-Admin's tts_settings global)
// ---------------------------------------------------------------------------

const HE_VOICES = [
  'he-IL-Wavenet-A',
  'he-IL-Wavenet-B',
  'he-IL-Wavenet-C',
  'he-IL-Wavenet-D',
  'he-IL-Standard-A',
  'he-IL-Standard-B',
  'he-IL-Standard-C',
  'he-IL-Standard-D',
] as const

const EN_VOICES = [
  'en-US-Neural2-A',
  'en-US-Neural2-C',
  'en-US-Neural2-D',
  'en-US-Neural2-F',
  'en-US-Neural2-H',
  'en-US-Neural2-J',
  'en-US-Wavenet-D',
  'en-US-Wavenet-F',
] as const

const ttsSettingsSchema = z.object({
  heVoice: z.enum(HE_VOICES),
  heGender: z.enum(['FEMALE', 'MALE']),
  enVoice: z.enum(EN_VOICES),
  enGender: z.enum(['FEMALE', 'MALE']),
  speakingRate: z.number().min(0.25).max(2.0),
})

type TtsSettings = z.infer<typeof ttsSettingsSchema>

// Mirror the Admin global's shipped defaults so TTS keeps working on cold
// starts before the first successful fetch and if Admin is unreachable AND
// we've never cached a good value.
const DEFAULT_SETTINGS: TtsSettings = {
  heVoice: 'he-IL-Wavenet-A',
  heGender: 'FEMALE',
  enVoice: 'en-US-Neural2-D',
  enGender: 'MALE',
  speakingRate: 0.85,
}

const SETTINGS_CACHE_TTL_MS = 60_000
// Bounded deadline for the admin fetch. Without this, a reachable-but-
// unresponsive admin hangs synthesizeSpeech indefinitely (undici fetch has
// no default timeout), turning "admin slow" into "lesson audio pipeline
// stalls until the platform function timeout kills it" — the .catch()
// fallback would never fire. 8s covers admin's serverless cold-start
// (Vercel function boot + first Payload query) which routinely exceeds
// the sub-second warm case; a tighter budget silently pinned every call
// to fallback defaults on cold hits.
const SETTINGS_FETCH_TIMEOUT_MS = 8000
// After a failed admin fetch, short-circuit to the fallback for this window
// instead of re-hitting admin on every TTS call. Without a negative-cache,
// a sustained admin outage becomes self-amplifying — each Web instance
// generates a fetch per synth call (throttled only by in-flight coalescing),
// hammering admin exactly when it's already struggling.
const SETTINGS_FAILURE_BACKOFF_MS = 10_000

let cachedSettings: TtsSettings | null = null
let cachedAt = 0
let lastFailureAt = 0
let inflightFetch: Promise<TtsSettings> | null = null

async function fetchSettingsFromAdmin(): Promise<TtsSettings> {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL
  if (!adminUrl) {
    throw new Error('NEXT_PUBLIC_ADMIN_URL not configured')
  }
  const response = await fetch(`${adminUrl}/api/tts-settings/current`, {
    // Bypass fetch cache — we own TTL in-process. Vercel/undici's
    // opaque cache layer would double-cache and delay propagation.
    cache: 'no-store',
    signal: AbortSignal.timeout(SETTINGS_FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`admin /api/tts-settings/current returned ${response.status}`)
  }
  const json: unknown = await response.json()
  const parsed = ttsSettingsSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`admin tts-settings response failed schema: ${parsed.error.message}`)
  }
  return parsed.data
}

async function getTtsSettings(): Promise<TtsSettings> {
  const now = Date.now()
  if (cachedSettings && now - cachedAt < SETTINGS_CACHE_TTL_MS) {
    return cachedSettings
  }
  // Negative-cache window: if the last fetch failed within the backoff, skip
  // the admin round-trip entirely and serve from cache/defaults.
  if (now - lastFailureAt < SETTINGS_FAILURE_BACKOFF_MS) {
    return cachedSettings ?? DEFAULT_SETTINGS
  }
  // Coalesce concurrent refreshes so a burst of TTS calls at TTL expiry
  // triggers exactly one admin fetch.
  if (inflightFetch) return inflightFetch

  inflightFetch = fetchSettingsFromAdmin()
    .then((settings) => {
      cachedSettings = settings
      cachedAt = Date.now()
      lastFailureAt = 0
      return settings
    })
    .catch((err) => {
      lastFailureAt = Date.now()
      logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        '[TTS] Failed to fetch settings from admin — falling back',
      )
      // Prefer last-known-good over hardcoded defaults if we ever fetched
      // successfully.
      return cachedSettings ?? DEFAULT_SETTINGS
    })
    .finally(() => {
      inflightFetch = null
    })

  return inflightFetch
}

// ---------------------------------------------------------------------------
// Synth
// ---------------------------------------------------------------------------

/**
 * Synthesize speech from text using Google Cloud TTS.
 * Returns base64-encoded MP3 audio.
 */
export async function synthesizeSpeech(
  text: string,
  locale: 'en' | 'he',
  payload?: Payload,
): Promise<string> {
  const apiKey = await getApiKey(payload)
  const settings = await getTtsSettings()

  const voiceName = locale === 'he' ? settings.heVoice : settings.enVoice
  const gender = locale === 'he' ? settings.heGender : settings.enGender
  const languageCode = locale === 'he' ? 'he-IL' : 'en-US'

  const body = {
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
      ssmlGender: gender,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: settings.speakingRate,
    },
  }

  const response = await fetch(TTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(
      { status: response.status, locale, textLength: text.length, voiceName },
      `[TTS] Google Cloud TTS API error: ${errorText}`,
    )
    throw new Error(`Google Cloud TTS API returned ${response.status}`)
  }

  const data = await response.json()
  return data.audioContent
}

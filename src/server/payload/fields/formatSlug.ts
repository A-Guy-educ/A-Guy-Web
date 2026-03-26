import slugify from 'slugify'

/**
 * Hebrew-to-Latin transliteration map.
 * Covers standard Hebrew consonants and final forms (sofit).
 */
const HEBREW_MAP: Record<string, string> = {
  א: '',
  ב: 'b',
  ג: 'g',
  ד: 'd',
  ה: 'h',
  ו: 'v',
  ז: 'z',
  ח: 'ch',
  ט: 't',
  י: 'y',
  כ: 'k',
  ך: 'k',
  ל: 'l',
  מ: 'm',
  ם: 'm',
  נ: 'n',
  ן: 'n',
  ס: 's',
  ע: 'a',
  פ: 'p',
  ף: 'f',
  צ: 'ts',
  ץ: 'ts',
  ק: 'k',
  ר: 'r',
  ש: 'sh',
  ת: 't',
}

/**
 * Transliterate Hebrew characters to Latin equivalents.
 * Non-Hebrew characters (including spaces, numbers, Latin letters) are kept as-is.
 * Hebrew niqqud (diacritics, U+0591–U+05C7) are stripped.
 */
function transliterateHebrew(input: string): string {
  // Strip Hebrew diacritics (niqqud)
  const stripped = input.replace(/[\u0591-\u05C7]/g, '')

  let result = ''
  for (const char of stripped) {
    if (char in HEBREW_MAP) {
      result += HEBREW_MAP[char]
    } else {
      result += char
    }
  }
  return result
}

/**
 * Hebrew-safe slug formatting utility.
 *
 * Transliterates Hebrew characters to Latin equivalents, then uses slugify
 * for final URL-safe formatting. Falls back to a timestamp-based slug
 * for empty/invalid input.
 *
 * @param input - The string to convert to a slug
 * @param fallback - Optional fallback string if the result is empty
 * @returns A URL-safe, lowercase slug string
 */
export function formatSlug(input: string, fallback?: string): string {
  const transliterated = transliterateHebrew(input.trim())

  const slug = slugify(transliterated, {
    lower: true,
    strict: true,
    remove: /[*#@]/g,
  })

  if (!slug && fallback) {
    return fallback
  }

  if (!slug) {
    return `item-${Date.now().toString(36)}`
  }

  return slug
}

/**
 * Strip Payload CMS duplication suffixes (-copy, -copy-2, etc.) from a slug.
 */
export function stripCopySuffix(slug: string): string {
  return slug.replace(/(-copy(-\d+)?)+$/g, '')
}

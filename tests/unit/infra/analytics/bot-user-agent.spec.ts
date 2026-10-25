import { describe, expect, it } from 'vitest'

import {
  categorizeBotUserAgent,
  isBotCategory,
  isBotUserAgent,
} from '@/infra/analytics/bot-user-agent'

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

describe('isBotUserAgent', () => {
  it('lets real browsers through', () => {
    expect(isBotUserAgent(CHROME)).toBe(false)
    expect(isBotUserAgent(IPHONE)).toBe(false)
  })

  it('treats a missing UA as a bot', () => {
    expect(isBotUserAgent(null)).toBe(true)
    expect(isBotUserAgent('')).toBe(true)
  })

  it.each(['curl/8.4.0', 'python-requests/2.31', 'HeadlessChrome/120', 'anthropic-ai'])(
    'flags %s',
    (ua) => {
      expect(isBotUserAgent(ua)).toBe(true)
    },
  )
})

describe('categorizeBotUserAgent', () => {
  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (compatible; YandexBot/3.0)',
    'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)',
    'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17 Safari/605.1.15 (Applebot/0.1)',
  ])('search: %s', (ua) => {
    expect(categorizeBotUserAgent(ua)).toBe('search')
  })

  it.each([
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'WhatsApp/2.23.20.0',
    'Twitterbot/1.0',
    'LinkedInBot/1.0 (compatible; Mozilla/5.0)',
    'TelegramBot (like TwitterBot)',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  ])('social-preview: %s', (ua) => {
    expect(categorizeBotUserAgent(ua)).toBe('social-preview')
  })

  it.each([
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'Mozilla/5.0 (compatible; PerplexityBot/1.0)',
    'CCBot/2.0 (https://commoncrawl.org/faq/)',
    'Mozilla/5.0 (compatible; Bytespider)',
    'Mozilla/5.0 (compatible) Applebot-Extended/0.1',
  ])('ai-crawler (checked before search): %s', (ua) => {
    expect(categorizeBotUserAgent(ua)).toBe('ai-crawler')
  })

  it.each([null, 'curl/8.4.0', 'UptimeRobot/2.0', 'HeadlessChrome/120', 'SomeRandomBot/1.0'])(
    'other: %s',
    (ua) => {
      expect(categorizeBotUserAgent(ua)).toBe('other')
    },
  )

  it('every categorised UA is also detected as a bot', () => {
    for (const ua of ['GPTBot/1.2', 'ClaudeBot/1.0', 'Googlebot/2.1', 'WhatsApp/2', 'CCBot/2.0']) {
      expect(isBotUserAgent(ua)).toBe(true)
    }
  })
})

describe('isBotCategory', () => {
  it('accepts only the four persisted categories', () => {
    expect(isBotCategory('search')).toBe(true)
    expect(isBotCategory('social-preview')).toBe(true)
    expect(isBotCategory('ai-crawler')).toBe(true)
    expect(isBotCategory('other')).toBe(true)
    expect(isBotCategory('socialPreview')).toBe(false)
    expect(isBotCategory(undefined)).toBe(false)
  })
})

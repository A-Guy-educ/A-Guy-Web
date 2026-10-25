/**
 * User-agent bot detection + coarse categorisation.
 *
 * Middleware uses `isBotUserAgent` to keep obvious automation out of the
 * guest-sessions funnel, and `categorizeBotUserAgent` to bucket those hits
 * into the daily `bot-hits` counters. Only the category is ever persisted —
 * never the raw UA string.
 *
 * Kept as a coarse denylist: the goal is to avoid inflating "landed but
 * didn't sign up" with scrapers, previews and monitoring, not to detect every
 * bot in the wild. Headless browsers that spoof a real UA get through here and
 * are caught (probabilistically) by the client-side JS beacon instead.
 */

export type BotCategory = 'search' | 'social-preview' | 'ai-crawler' | 'other'

export const BOT_CATEGORIES: readonly BotCategory[] = [
  'search',
  'social-preview',
  'ai-crawler',
  'other',
]

const BOT_UA_RE =
  /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegrambot|prerender|lighthouse|headlesschrome|pingdom|uptimerobot|axios|curl|wget|python-requests|node-fetch|go-http-client|anthropic-ai|claude-web|perplexity|cohere-ai|google-extended/i

// Checked before search: several AI agents carry a search-engine prefix
// (Applebot-Extended, Google-Extended) or a generic `bot` suffix.
const AI_CRAWLER_RE =
  /gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|claude-user|claude-searchbot|anthropic-ai|perplexity|google-extended|applebot-extended|ccbot|bytespider|amazonbot|meta-externalagent|meta-externalfetcher|cohere-ai|diffbot|youbot|mistralai-user|timpibot|ai2bot/i

const SOCIAL_PREVIEW_RE =
  /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|slack-imgproxy|discordbot|pinterest|skypeuripreview|redditbot|embedly|vkshare|iframely|snapchat|viber/i

const SEARCH_RE =
  /googlebot|google-inspectiontool|storebot-google|bingbot|bingpreview|yandex|baiduspider|duckduckbot|slurp|applebot|petalbot|seznambot|naverbot|yeti\/|sogou|qwantbot|mojeekbot/i

export function isBotUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return true
  return BOT_UA_RE.test(userAgent)
}

/** Category for a UA already known to be a bot. Missing UA → 'other'. */
export function categorizeBotUserAgent(userAgent: string | null): BotCategory {
  if (!userAgent) return 'other'
  if (AI_CRAWLER_RE.test(userAgent)) return 'ai-crawler'
  if (SOCIAL_PREVIEW_RE.test(userAgent)) return 'social-preview'
  if (SEARCH_RE.test(userAgent)) return 'search'
  return 'other'
}

export function isBotCategory(value: unknown): value is BotCategory {
  return typeof value === 'string' && (BOT_CATEGORIES as readonly string[]).includes(value)
}

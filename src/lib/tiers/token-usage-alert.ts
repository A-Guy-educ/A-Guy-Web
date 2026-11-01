/**
 * Which "you've used X% of your tokens" alert to show, if any.
 *
 * Each window (daily, monthly) alerts once at 50% and once at 90%. An alert
 * is identified by window + threshold + the window's cap + its `resetAt`, so
 * it re-arms when the window rolls over or the cap changes (tier upgrade,
 * admin override) — a new cap is a new budget to warn about. Crossing straight past 50% to 90% shows only
 * the 90% alert and retires the 50% one for that window.
 *
 * Exhausted windows (100%) are skipped: the quota-exhausted card already
 * owns that moment.
 *
 * Pure and client-safe.
 *
 * @fileType utility
 * @domain llm
 */

export type TokenUsageWindowName = 'daily' | 'monthly'

export interface TokenUsageWindowSnapshot {
  used: number
  limit: number | null
  resetAt: string | null
}

export interface TokenUsageSnapshot {
  daily: TokenUsageWindowSnapshot
  monthly: TokenUsageWindowSnapshot
}

export const TOKEN_USAGE_ALERT_THRESHOLDS = [90, 50] as const
export type TokenUsageAlertThreshold = (typeof TOKEN_USAGE_ALERT_THRESHOLDS)[number]

export interface TokenUsageAlert {
  window: TokenUsageWindowName
  threshold: TokenUsageAlertThreshold
  resetAt: string | null
  /** Every key to record as seen once this alert is shown. */
  keys: string[]
}

// Monthly first at equal thresholds: running low on the month is the bigger news.
const WINDOW_PRIORITY: readonly TokenUsageWindowName[] = ['monthly', 'daily']

export function tokenUsageAlertKey(
  window: TokenUsageWindowName,
  threshold: TokenUsageAlertThreshold,
  { limit, resetAt }: Pick<TokenUsageWindowSnapshot, 'limit' | 'resetAt'>,
): string {
  return `${window}:${threshold}:${limit ?? 'none'}:${resetAt ?? 'none'}`
}

function usagePercent({ used, limit }: TokenUsageWindowSnapshot): number | null {
  if (limit === null || limit <= 0) return null
  return (used / limit) * 100
}

export function pickTokenUsageAlert(
  usage: TokenUsageSnapshot,
  isSeen: (key: string) => boolean,
): TokenUsageAlert | null {
  for (const threshold of TOKEN_USAGE_ALERT_THRESHOLDS) {
    for (const window of WINDOW_PRIORITY) {
      const snapshot = usage[window]
      const percent = usagePercent(snapshot)
      if (percent === null || percent < threshold || percent >= 100) continue

      const key = tokenUsageAlertKey(window, threshold, snapshot)
      if (isSeen(key)) continue

      const lowerKeys = TOKEN_USAGE_ALERT_THRESHOLDS.filter((t) => t < threshold).map((t) =>
        tokenUsageAlertKey(window, t, snapshot),
      )
      return { window, threshold, resetAt: snapshot.resetAt, keys: [key, ...lowerKeys] }
    }
  }
  return null
}

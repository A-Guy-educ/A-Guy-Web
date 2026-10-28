/**
 * Product Health is behind a boolean env flag so the platform can ship
 * the endpoint change independent of the widgets. When off, the route
 * omits `productHealth` from the response, keeping Dash's optional-field
 * degradation path exercised in production until the switch is flipped.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

export function isProductHealthEnabled(): boolean {
  const raw = process.env.PRODUCT_HEALTH_ENABLED
  if (!raw) return false
  return TRUTHY.has(raw.trim().toLowerCase())
}

/**
 * Active User threshold: one lesson visit with at least this much visible
 * dwell (spec v0.4 §2). Kept as a single default that the `activeDwellSeconds`
 * query param can override, so 1 / 5 / 10 minute thresholds can be compared
 * as retention predictors without a deploy.
 */
export const DEFAULT_ACTIVE_DWELL_SECONDS = 60

/** Only visits to lessons rendered as a PDF can make a user Active. */
export const ACTIVE_CONTENT_TYPE = 'pdf'

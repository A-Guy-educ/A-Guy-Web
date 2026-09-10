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

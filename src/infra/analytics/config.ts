/**
 * Analytics Configuration
 *
 * Environment-based configuration for analytics system
 * Simplified: presence of token/key enables the platform
 *
 * @fileType configuration
 * @domain analytics
 * @pattern singleton-lazy-proxy
 * @ai-summary Lazy Proxy SSR trap: config reads `window` eagerly at module level but the Proxy defers `getAnalyticsConfig()` until first property access — ensuring client-only execution after `window` is available. E2E override via `window.__analyticsEnabled` bypasses token presence check without a rebuild.
 */

import type { AnalyticsConfig } from './types'

// Extend Window for E2E test override — set via Playwright addInitScript
declare global {
  interface Window {
    __analyticsEnabled?: boolean
  }
}

/**
 * Get analytics configuration from environment variables
 *
 * Simple rule: If a token/key is set, that platform is enabled
 * - NEXT_PUBLIC_GA4_MEASUREMENT_ID: Enables GA4
 * - NEXT_PUBLIC_MIXPANEL_TOKEN: Enables Mixpanel
 *
 * Debug mode is enabled in development only
 */
export function getAnalyticsConfig(): AnalyticsConfig {
  // NEXT_PUBLIC_ env vars are available everywhere (SSR and client)
  const ga4MeasurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  const mixpanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN

  // Test/E2E override: set __analyticsEnabled on window before config reads it.
  // This avoids rebuilding the app when toggling analytics for E2E tests.
  const forceEnabled = typeof window !== 'undefined' && window.__analyticsEnabled === true

  // Analytics is enabled if at least one platform has credentials, or test override is set
  const ga4Enabled = forceEnabled || !!ga4MeasurementId
  const mixpanelEnabled = forceEnabled || !!mixpanelToken
  const enabled = ga4Enabled || mixpanelEnabled

  // Debug mode only in development
  const debugMode = process.env.NODE_ENV === 'development'

  return {
    enabled,
    debugMode,
    ga4: {
      measurementId: ga4MeasurementId,
      enabled: ga4Enabled,
    },
    mixpanel: {
      token: mixpanelToken,
      enabled: mixpanelEnabled,
    },
  }
}

/**
 * Singleton config instance (lazy-loaded to avoid SSR issues)
 * Using Proxy to defer config creation until first access, ensuring it runs client-side
 */
let _analyticsConfig: AnalyticsConfig | null = null

export const analyticsConfig: AnalyticsConfig = new Proxy({} as AnalyticsConfig, {
  get(_target, prop) {
    if (!_analyticsConfig) {
      _analyticsConfig = getAnalyticsConfig()
    }
    return _analyticsConfig[prop as keyof AnalyticsConfig]
  },
})

/**
 * Validate configuration (call before first use)
 */
export function validateConfig(): void {
  if (!analyticsConfig.enabled) {
    if (analyticsConfig.debugMode) {
      console.log('[Analytics] Disabled - no platform credentials configured')
    }
    return
  }

  if (analyticsConfig.debugMode) {
    console.log('[Analytics] Configuration:', {
      enabled: analyticsConfig.enabled,
      ga4Enabled: analyticsConfig.ga4.enabled,
      mixpanelEnabled: analyticsConfig.mixpanel.enabled,
    })
  }
}

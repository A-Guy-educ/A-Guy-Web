import type { FeatureFlags } from '@/lib/feature-flags'

export function buildFeatureFlags(overrides?: Partial<FeatureFlags>): FeatureFlags {
  return {
    SUMMARY_MAINTENANCE_ENABLED: false,
    MEMORY_EXTRACTION_ENABLED: false,
    MEMORY_RETRIEVAL_ENABLED: false,
    ...overrides,
  }
}

export function createFeatureFlagModule(flags: FeatureFlags) {
  return {
    featureFlags: flags,
    getFeatureFlagStatus: () => ({
      summaryMaintenance: flags.SUMMARY_MAINTENANCE_ENABLED,
      memoryExtraction: flags.MEMORY_EXTRACTION_ENABLED,
      memoryRetrieval: flags.MEMORY_RETRIEVAL_ENABLED,
    }),
    logFeatureFlags: () => undefined,
  }
}

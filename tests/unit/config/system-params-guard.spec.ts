/**
 * Unit Tests for System Params Config Loading Guard
 *
 * Validates that system params throw ConfigNotLoadedError when accessed
 * before loadRuntimeConfig() has been called.
 *
 * Note: getSystemParam() has been removed. Use getPdfConversionMaxPromptSizeBytes()
 * and other SystemParams methods which internally use ConfigValues.
 */
import { ConfigNotLoadedError } from '@/infra/config/runtime/errors'
import { clearConfigCache, isConfigLoaded } from '@/infra/config/runtime/runtime-config'
import { getPdfConversionMaxPromptSizeBytes } from '@/infra/config/system-params'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('System Params Config Guard', () => {
  beforeEach(() => {
    // Ensure config cache is cleared before each test
    clearConfigCache()
  })

  afterEach(() => {
    // Clean up after each test
    clearConfigCache()
  })

  it('should throw ConfigNotLoadedError when getPdfConversionMaxPromptSizeBytes is called without loading config', () => {
    expect(isConfigLoaded()).toBe(false)

    expect(() => {
      getPdfConversionMaxPromptSizeBytes('some-tenant-id')
    }).toThrow(ConfigNotLoadedError)
  })
})

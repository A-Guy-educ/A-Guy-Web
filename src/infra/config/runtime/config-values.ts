import type { ConfigDomain } from '@/infra/config/config-constants'
import type { ConfigValuesCache, LoadConfigValuesResult } from './types'

let loaded = false

export function setConfigGetterForLazyLoading(_getter: unknown): void {
  loaded = true
}

export async function loadConfigValues(
  _source?: unknown,
  _tenantId?: string,
): Promise<LoadConfigValuesResult> {
  loaded = true
  return {
    success: true,
    valuesLoaded: 0,
    errors: [],
    loadedAt: new Date(),
  }
}

export async function reloadConfigValues(
  source?: unknown,
  tenantId?: string,
): Promise<LoadConfigValuesResult> {
  loaded = false
  return loadConfigValues(source, tenantId)
}

export async function getConfigDomain<T = Record<string, unknown>>(
  domain: ConfigDomain | string,
  options?: { defaultValue?: T; throwIfNotFound?: boolean; tenantId?: string },
): Promise<T> {
  loaded = true
  return (options?.defaultValue ?? {}) as T
}

export async function getConfigValueByKey<T = unknown>(
  _domain: ConfigDomain | string,
  key: string,
  options?: { defaultValue?: T; throwIfNotFound?: boolean; tenantId?: string },
): Promise<T | undefined> {
  loaded = true
  const envValue = process.env[key]
  if (envValue !== undefined) return envValue as T
  return options?.defaultValue
}

export async function getConfigDomains(_tenantId?: string): Promise<ConfigDomain[]> {
  loaded = true
  return []
}

export function isConfigValuesLoaded(): boolean {
  return loaded
}

export function getConfigValuesCache(): ConfigValuesCache | null {
  return null
}

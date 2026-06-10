import type { LoadConfigResult } from './types'

let loaded = false

export async function loadRuntimeConfig(
  _source?: unknown,
  _tenantId?: string,
): Promise<LoadConfigResult> {
  loaded = true
  return {
    success: true,
    secretsLoaded: 0,
    errors: [],
    loadedAt: new Date(),
  }
}

export async function reloadRuntimeConfig(
  source?: unknown,
  tenantId?: string,
): Promise<LoadConfigResult> {
  loaded = false
  return loadRuntimeConfig(source, tenantId)
}

export interface GetSecretOptions {
  tenantId?: string
  defaultValue?: string
  throwIfNotFound?: boolean
}

export function getSecret(key: string, options?: GetSecretOptions): string {
  const value = process.env[key] ?? options?.defaultValue
  if (value !== undefined) return value
  if (options?.throwIfNotFound === false) return ''
  throw new Error(`Missing secret: ${key}`)
}

export function isConfigLoaded(): boolean {
  return loaded
}

export function getSecretKeys(_tenantId?: string): string[] {
  return []
}

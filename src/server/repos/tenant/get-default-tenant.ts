export function getDefaultTenantSlug(): string {
  return process.env.DEFAULT_TENANT_SLUG || 'default'
}

export async function getDefaultTenantId(_source?: unknown): Promise<string> {
  return getDefaultTenantSlug()
}

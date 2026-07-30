import { z } from 'zod'

const targetPattern =
  /^([A-Za-z0-9][A-Za-z0-9._-]{0,99})\/([A-Za-z0-9][A-Za-z0-9._-]{0,99})\/([a-z0-9][a-z0-9-]{0,63})$/

const environmentSchema = z.object({
  NODE_ENV: z.string().optional(),
  NEXT_PUBLIC_SERVER_URL: z.string().url(),
  KODY_BRAND_CHAT_LAUNCH_URL: z.string().url(),
  KODY_BRAND_CHAT_TARGET: z.string().regex(targetPattern, 'Invalid Brand Chat target'),
  KODY_BRAND_CHAT_PRIVATE_KEY: z.string().min(64),
  KODY_BRAND_CHAT_KEY_ID: z.string().regex(/^[A-Za-z0-9._-]{1,100}$/),
})

export interface KodyBrandChatConfig {
  issuer: string
  audience: 'kody-brand-chat'
  launchUrl: string
  target: {
    owner: string
    repo: string
    brandSlug: string
  }
  privateKeyPkcs8: string
  keyId: string
}

function normalizedOrigin(value: string): string {
  return new URL(value).origin
}

export function getKodyBrandChatConfig(
  environment: Record<string, string | undefined> = process.env,
): KodyBrandChatConfig {
  const parsed = environmentSchema.parse(environment)
  const issuer = normalizedOrigin(parsed.NEXT_PUBLIC_SERVER_URL)
  const launchUrl = new URL(parsed.KODY_BRAND_CHAT_LAUNCH_URL)
  if (
    parsed.NODE_ENV === 'production' &&
    (new URL(issuer).protocol !== 'https:' || launchUrl.protocol !== 'https:')
  ) {
    throw new Error('Kody Brand Chat requires HTTPS in production')
  }

  const target = targetPattern.exec(parsed.KODY_BRAND_CHAT_TARGET)
  if (!target) throw new Error('Invalid Kody Brand Chat target')

  return {
    issuer,
    audience: 'kody-brand-chat',
    launchUrl: launchUrl.toString(),
    target: {
      owner: target[1],
      repo: target[2],
      brandSlug: target[3],
    },
    privateKeyPkcs8: parsed.KODY_BRAND_CHAT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    keyId: parsed.KODY_BRAND_CHAT_KEY_ID,
  }
}

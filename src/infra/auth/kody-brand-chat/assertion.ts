import { createPrivateKey, createPublicKey, randomUUID } from 'node:crypto'

import { importPKCS8, SignJWT, type JWK } from 'jose'

import type { KodyBrandChatConfig } from './config'

const ASSERTION_TTL_SECONDS = 60

export async function createKodyBrandChatAssertion(
  identity: { subject: string },
  config: KodyBrandChatConfig,
  options: { now?: number; tokenId?: string } = {},
): Promise<string> {
  const subject = identity.subject.trim()
  if (!subject || subject.length > 300) {
    throw new Error('Invalid Brand Chat user id')
  }
  const now = options.now ?? Math.floor(Date.now() / 1000)
  const privateKey = await importPKCS8(config.privateKeyPkcs8, 'ES256')

  return await new SignJWT({
    tenant_id: `${config.target.owner}/${config.target.repo}`,
    brand_slug: config.target.brandSlug,
  })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT', kid: config.keyId })
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setSubject(subject)
    .setJti(options.tokenId ?? randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + ASSERTION_TTL_SECONDS)
    .sign(privateKey)
}

export async function createKodyBrandChatPublicJwks(
  config: KodyBrandChatConfig,
): Promise<{ keys: JWK[] }> {
  const privateKey = createPrivateKey(config.privateKeyPkcs8)
  const publicKey = createPublicKey(privateKey)
  const jwk = publicKey.export({ format: 'jwk' })
  return {
    keys: [
      {
        ...jwk,
        alg: 'ES256',
        use: 'sig',
        kid: config.keyId,
      },
    ],
  }
}

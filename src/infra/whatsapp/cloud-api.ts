/**
 * WhatsApp Cloud API client
 *
 * @fileType utility
 * @domain auth
 * @pattern whatsapp-login
 * @ai-summary Sends a one-time login code through Meta's WhatsApp Cloud API using an approved Authentication template (body code + copy-code button).
 */

import { logger } from '@/infra/utils/logger'

const GRAPH_API_VERSION = 'v23.0'
const DEFAULT_TEMPLATE_LANGUAGE = 'he'

interface WhatsAppConfig {
  accessToken: string
  phoneNumberId: string
  templateName: string
  templateLanguage: string
}

function readConfig(): WhatsAppConfig | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const templateName = process.env.WHATSAPP_AUTH_TEMPLATE_NAME
  if (!accessToken || !phoneNumberId || !templateName) return null
  return {
    accessToken,
    phoneNumberId,
    templateName,
    templateLanguage: process.env.WHATSAPP_AUTH_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE,
  }
}

/**
 * Whether WhatsApp login can run in this deployment. The login page hides the
 * option until all three variables are set, so shipping the code ahead of the
 * Meta setup is safe.
 */
export function isWhatsAppLoginConfigured(): boolean {
  return isDevFakeSendEnabled() || readConfig() !== null
}

/**
 * Local stand-in for Meta: log the code instead of sending it, so the whole
 * login flow can be exercised before a template is approved. Also requires
 * `pnpm dev` (deployments, previews included, run with NODE_ENV=production),
 * so a stray env var cannot let anyone log in as any number.
 */
function isDevFakeSendEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.WHATSAPP_DEV_FAKE_SEND === '1'
}

/**
 * Authentication templates take the code twice: once for the message body and
 * once for the copy-code button (which Meta models as a URL button).
 */
export function buildAuthCodeMessage(
  to: string,
  code: string,
  template: { name: string; language: string },
) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: template.name,
      language: { code: template.language },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: code }] },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: code }],
        },
      ],
    },
  }
}

/**
 * Send `code` to `to` (digits-only E.164). Throws when WhatsApp is not
 * configured or Meta rejects the message; the error never carries the token.
 */
export async function sendWhatsAppAuthCode(to: string, code: string): Promise<void> {
  if (isDevFakeSendEnabled()) {
    logger.warn({ to, code }, 'WHATSAPP_DEV_FAKE_SEND: not sent to WhatsApp, use this code')
    return
  }

  const config = readConfig()
  if (!config) throw new Error('WhatsApp login is not configured')

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        buildAuthCodeMessage(to, code, {
          name: config.templateName,
          language: config.templateLanguage,
        }),
      ),
    },
  )

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: number; message?: string }
    } | null
    logger.error(
      { status: response.status, metaError: body?.error?.code, message: body?.error?.message },
      'WhatsApp auth code send failed',
    )
    throw new Error(`WhatsApp send failed (${response.status})`)
  }
}

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildAuthCodeMessage,
  isWhatsAppLoginConfigured,
  sendWhatsAppAuthCode,
} from '@/infra/whatsapp/cloud-api'

function configure() {
  vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token')
  vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123456')
  vi.stubEnv('WHATSAPP_AUTH_TEMPLATE_NAME', 'login_code')
  vi.stubEnv('WHATSAPP_AUTH_TEMPLATE_LANGUAGE', '')
}

describe('WhatsApp Cloud API client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('is not configured until token, phone number id and template are set', () => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', '')
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '')
    vi.stubEnv('WHATSAPP_AUTH_TEMPLATE_NAME', '')
    expect(isWhatsAppLoginConfigured()).toBe(false)
    configure()
    expect(isWhatsAppLoginConfigured()).toBe(true)
  })

  it('puts the code in both the body and the copy-code button', () => {
    const message = buildAuthCodeMessage('972501234567', '012345', {
      name: 'login_code',
      language: 'he',
    })
    expect(message.to).toBe('972501234567')
    expect(message.template.language).toEqual({ code: 'he' })
    expect(message.template.components).toEqual([
      { type: 'body', parameters: [{ type: 'text', text: '012345' }] },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: '012345' }],
      },
    ])
  })

  it('posts to the configured phone number with the bearer token, defaulting to Hebrew', async () => {
    configure()
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendWhatsAppAuthCode('972501234567', '654321')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/123456\/messages$/)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token')
    const body = JSON.parse(String(init.body))
    expect(body.template).toMatchObject({ name: 'login_code', language: { code: 'he' } })
  })

  it('throws without leaking the token when Meta rejects the message', async () => {
    configure()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 131030, message: 'not in allowed list' } }), {
          status: 400,
        }),
      ),
    )

    const error = await sendWhatsAppAuthCode('972501234567', '654321').catch((e: Error) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).not.toContain('test-token')
  })

  it('refuses to send when not configured', async () => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', '')
    await expect(sendWhatsAppAuthCode('972501234567', '000000')).rejects.toThrow(/not configured/)
  })
})

import { randomBytes } from 'node:crypto'

import type { KodyBrandChatConfig } from './config'

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function renderKodyBrandChatLaunchPage(
  config: KodyBrandChatConfig,
  assertion: string,
  options: { nonce?: string } = {},
): { html: string; nonce: string } {
  const nonce = options.nonce ?? randomBytes(18).toString('base64url')
  const fields = {
    assertion,
    owner: config.target.owner,
    repo: config.target.repo,
    brandSlug: config.target.brandSlug,
  }
  const inputs = Object.entries(fields)
    .map(
      ([name, value]) => `<input type="hidden" name="${name}" value="${escapeAttribute(value)}" />`,
    )
    .join('')

  return {
    nonce,
    html:
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
      '<title>Opening chat…</title></head><body>' +
      `<form id="brand-chat-launch" method="post" action="${escapeAttribute(config.launchUrl)}">${inputs}` +
      '<noscript><button type="submit">Open chat</button></noscript></form>' +
      `<script nonce="${nonce}">document.getElementById("brand-chat-launch").submit()</script>` +
      '</body></html>',
  }
}

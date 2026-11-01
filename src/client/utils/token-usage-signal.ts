/**
 * Window event fired after every AI chat turn settles, so the token-usage
 * alert can re-check usage without each chat surface knowing about it.
 * Same pattern as the `auth:changed` event `useCurrentUser` listens to.
 */

export const TOKEN_USAGE_CHANGED_EVENT = 'llm-usage:changed'

export function signalTokenUsageChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(TOKEN_USAGE_CHANGED_EVENT))
}

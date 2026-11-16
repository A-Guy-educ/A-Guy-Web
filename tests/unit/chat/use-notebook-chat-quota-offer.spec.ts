/**
 * A quota rejection in the side chat becomes an in-chat upgrade offer (not an
 * error strip), tagged with what hit the cap so a notebook page check gets
 * notebook copy.
 *
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiService } from '@/server/services/api/api-service'
import { useNotebookChat } from '@/ui/web/chat'

vi.mock('@/server/services/api/api-service', () => ({
  apiService: {
    chat: vi.fn(),
    chatStream: vi.fn(),
    checkNotebookPage: vi.fn(),
    getConversation: vi.fn(),
    resetChat: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

const props = {
  initialMessage: 'Welcome!',
  authRequiredMessage: 'Sign in required',
  errorMessage: 'Something went wrong',
  hintPrompt: 'Hint prompt',
  solutionPrompt: 'Solution prompt',
  fullSolutionPrompt: 'Full solution prompt',
  resetConfirmMessage: 'Confirm reset',
  resetSuccessMessage: 'Reset success',
  resetErrorMessage: 'Reset error',
  acknowledgment: 'Acknowledged',
  lessonId: 'lesson-1',
}

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>

async function renderChat() {
  const hook = renderHook(() => useNotebookChat(props))
  await waitFor(() => expect(hook.result.current.isLoadingHistory).toBe(false))
  return hook
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked(apiService.getConversation).mockResolvedValue({
    success: true,
    exists: false,
    messages: [],
  })
})

describe('useNotebookChat quota offer', () => {
  it('turns a quota-rejected chat turn into a chat offer', async () => {
    mocked(apiService.chatStream).mockReturnValueOnce(
      (async function* () {
        yield { type: 'error', errorCode: 'quota_exceeded' }
      })(),
    )
    const { result } = await renderChat()

    act(() => result.current.setInputValue('Hello'))
    await act(async () => {
      result.current.handleSubmit({ preventDefault: () => undefined } as React.FormEvent)
    })

    await waitFor(() => expect(result.current.quotaOffer?.source).toBe('chat'))
    expect(result.current.chatError).toBeNull()
  })

  it('tags a quota-rejected notebook page check as a notebook offer', async () => {
    mocked(apiService.checkNotebookPage).mockResolvedValueOnce({
      success: false,
      errorType: 'quota',
      quotaExceeded: true,
    })
    const { result } = await renderChat()

    await act(async () => {
      await result.current.checkNotebookPage('data:image/png;base64,AA', undefined, 'en')
    })

    expect(result.current.quotaOffer?.source).toBe('notebook')
    expect(result.current.chatError).toBeNull()
  })
})

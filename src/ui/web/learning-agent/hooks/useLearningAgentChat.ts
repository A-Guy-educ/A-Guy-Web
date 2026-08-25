'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { readDataSse } from '@/infra/llm/read-data-sse'

export interface LearningAgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface UseLearningAgentChatOptions {
  gradeLevel: string
  locale?: string
  initialMessage?: string
  onConversationCreated?: (conversationId: string) => void
}

interface UseLearningAgentChatReturn {
  messages: LearningAgentMessage[]
  inputValue: string
  isLoading: boolean
  isOpen: boolean
  conversationId: string | null
  setInputValue: (value: string) => void
  sendMessage: (message: string) => Promise<void>
  setIsOpen: (open: boolean) => void
  resetChat: () => void
}

/**
 * Hook for managing learning agent chat state and API calls
 */
export function useLearningAgentChat({
  gradeLevel,
  locale,
  initialMessage,
  onConversationCreated,
}: UseLearningAgentChatOptions): UseLearningAgentChatReturn {
  const defaultWelcomeMessage =
    locale === 'he'
      ? 'היי! אני העוזר האישי שלך ללמידה. אני יכול לעזור לך עם הקורסים שלך, להציע מה ללמוד הלאה ולעקוב אחר ההתקדמות שלך. איך אוכל לעזור לך היום?'
      : "Hi! I'm your personal learning assistant. I can help you with your courses, suggest what to learn next, and track your progress. How can I help you today?"
  const [messages, setMessages] = useState<LearningAgentMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: initialMessage ?? defaultWelcomeMessage,
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return

      const userMessage: LearningAgentMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message.trim(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInputValue('')
      setIsLoading(true)

      try {
        const response = await fetch('/api/agent/learning-chat', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            turnId: userMessage.id,
            acknowledgment: 'Understood',
            conversationId,
            gradeLevel,
            locale,
          }),
        })

        if (!response.ok) {
          if (response.status === 401) {
            toast.error('Please log in to use the learning assistant')
            return
          }
          throw new Error('Failed to send message')
        }

        if (!response.body) throw new Error('No response body')
        let fullText = ''
        const assistantMessageId = crypto.randomUUID()

        // Add placeholder assistant message
        setMessages((prev) => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }])

        for await (const data of readDataSse<{
          type: 'chunk' | 'done' | 'error'
          text?: string
          conversationId?: string
          error?: string
        }>(response.body)) {
          if (data.type === 'chunk' && data.text) {
            fullText += data.text
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, content: fullText } : msg,
              ),
            )
          } else if (data.type === 'done' && data.conversationId) {
            setConversationId(data.conversationId)
            onConversationCreated?.(data.conversationId)
          } else if (data.type === 'error') {
            throw new Error(data.error || 'Chat error')
          }
        }
      } catch (error) {
        console.error('Chat error:', error)
        toast.error('Failed to send message. Please try again.')

        // Remove the user message on error
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, conversationId, gradeLevel, locale, onConversationCreated],
  )

  const resetChat = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: initialMessage ?? defaultWelcomeMessage,
      },
    ])
    setConversationId(null)
  }, [initialMessage, defaultWelcomeMessage])

  return {
    messages,
    inputValue,
    isLoading,
    isOpen,
    conversationId,
    setInputValue,
    sendMessage,
    setIsOpen,
    resetChat,
  }
}

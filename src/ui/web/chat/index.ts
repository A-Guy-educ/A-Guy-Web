'use client'

import dynamic from 'next/dynamic'

export { ChatMessageContent } from './ChatMessageContent'
export { ChatMessageView } from './ChatMessageView'
export type { ChatInterfaceProps, ViewMode } from './ChatInterface'
export const ChatInterface = dynamic(
  () => import('./ChatInterface').then((module) => module.ChatInterface),
  { ssr: false },
)
export { TTSButton } from './TTSButton'
export { useNotebookChat } from './hooks/useNotebookChat'
export { useTTS } from './hooks/useTTS'
export { parseView } from './ChatMessageView/parseView'

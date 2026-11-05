'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { ContactDialog } from './ContactDialog'
import { DEFAULT_TOPIC, type ContactTopic } from './contactOptions'

interface ContactDialogContextValue {
  open: (topic?: ContactTopic) => void
}

const ContactDialogContext = createContext<ContactDialogContextValue | null>(null)

export function useContactDialog(): ContactDialogContextValue {
  const ctx = useContext(ContactDialogContext)
  if (!ctx) throw new Error('useContactDialog must be used inside ContactDialogProvider')
  return ctx
}

export function ContactDialogProvider({ children }: { children: ReactNode }) {
  const [topic, setTopic] = useState<ContactTopic | null>(null)

  const open = useCallback((next?: ContactTopic) => setTopic(next ?? DEFAULT_TOPIC), [])
  const close = useCallback(() => setTopic(null), [])
  const value = useMemo(() => ({ open }), [open])

  return (
    <ContactDialogContext.Provider value={value}>
      {children}
      {topic ? <ContactDialog initialTopic={topic} onClose={close} /> : null}
    </ContactDialogContext.Provider>
  )
}

'use client'

import type { ReactNode } from 'react'

import type { ContactTopic } from './contactOptions'
import { useContactDialog } from './ContactDialogProvider'

interface ContactButtonProps {
  className: string
  topic?: ContactTopic
  children: ReactNode
}

export function ContactButton({ className, topic, children }: ContactButtonProps) {
  const { open } = useContactDialog()
  return (
    <button type="button" className={className} onClick={() => open(topic)}>
      {children}
    </button>
  )
}

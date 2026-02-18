'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/web/components/dialog'
import { GoogleLoginButton } from '@/ui/web/auth/GoogleLoginButton'

interface AuthGateModalProps {
  isOpen: boolean
  title: string
  description: string
  returnTo: string
}

export function AuthGateModal({ isOpen, title, description, returnTo }: AuthGateModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent allowDismiss={false} className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="mt-2">{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-center">
          <GoogleLoginButton returnTo={returnTo} variant="default" className="w-full" />
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import React from 'react'
import { useFormFields } from '@payloadcms/ui'
import { PDFMedia } from '@/components/Media/PDFMedia'

export const PDFPreviewClient: React.FC = () => {
  const urlField = useFormFields(([fields]) => fields.url)
  const url = urlField?.value as string | undefined

  if (!url) {
    return (
      <div className="p-4">
        <p>No PDF uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="p-4 h-[500px]">
      <PDFMedia resource={{ url } as any} />
    </div>
  )
}

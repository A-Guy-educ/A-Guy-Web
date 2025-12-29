'use client'

/**
 * Payload Custom Field Component for contentJson
 */

import React from 'react'
import type { TextFieldClientComponent } from 'payload'
import { FieldLabel, FieldDescription, useField } from '@payloadcms/ui'
import { ContentJsonEditor } from './ContentJsonEditor'
import type { ExerciseContent } from '@/contracts'

export const ContentJsonField: TextFieldClientComponent = (props) => {
  const { path, field, readOnly } = props
  const { value, setValue } = useField<ExerciseContent>({ path })

  return (
    <div className="field-type-json">
      <div className="field-type-wrapper">
        <FieldLabel label={field.label} path={path} required={field.required} />
        {field?.admin?.description && (
          <FieldDescription description={field.admin.description} path={path} />
        )}
        <div style={{ marginTop: '0.75rem' }}>
          <ContentJsonEditor
            value={value || { stem: [] }}
            onChange={readOnly ? () => {} : setValue}
            path={path}
          />
        </div>
      </div>
    </div>
  )
}

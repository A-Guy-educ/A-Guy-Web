'use client'

/**
 * Payload Custom Field Component for answerSpecJson
 */

import React from 'react'
import type { TextFieldClientComponent } from 'payload'
import { FieldLabel, FieldDescription, useField, useFormFields } from '@payloadcms/ui'
import { AnswerSpecJsonEditor } from './AnswerSpecJsonEditor'
import type { AnswerSpec } from '@/contracts'

export const AnswerSpecJsonField: TextFieldClientComponent = (props) => {
  const { path, field, readOnly } = props
  const { value, setValue } = useField<AnswerSpec>({ path })

  // Get the questionType from the form
  const questionTypeField = useFormFields(([fields]) => fields.questionType)
  const questionType = (questionTypeField?.value as 'mcq' | 'true_false' | 'free_response') || 'mcq'

  // Default value if undefined
  const defaultValue: AnswerSpec = {
    questionType: 'mcq',
    multiSelect: false,
    options: [],
    correctOptionIds: [],
  }

  return (
    <div className="field-type-json">
      <div className="field-type-wrapper">
        <FieldLabel label={field.label} path={path} required={field.required} />
        {field?.admin?.description && (
          <FieldDescription description={field.admin.description} path={path} />
        )}
        <div style={{ marginTop: '0.75rem' }}>
          <AnswerSpecJsonEditor
            value={value || defaultValue}
            onChange={readOnly ? () => {} : setValue}
            questionType={questionType}
            path={path}
          />
        </div>
      </div>
    </div>
  )
}

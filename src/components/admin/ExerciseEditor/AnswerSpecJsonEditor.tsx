'use client'

/**
 * AnswerSpecJson Editor - Main orchestrator for answer specifications
 */

import React, { useState, useCallback } from 'react'
import type { AnswerSpec } from '@/contracts'
import { AnswerSpecSchema } from '@/contracts'
import { zodErrorsToEditorErrors } from '../shared/utils'
import type { EditorError } from '../shared/types'
import { ErrorDisplay } from '../shared/ErrorDisplay'
import { AdvancedJsonPanel } from '../shared/AdvancedJsonPanel'
import { McqAnswerEditor } from './McqAnswerEditor'
import { TrueFalseAnswerEditor } from './TrueFalseAnswerEditor'
import { FreeResponseAnswerEditor } from './FreeResponseAnswerEditor'

interface AnswerSpecJsonEditorProps {
  value: AnswerSpec
  onChange: (value: AnswerSpec) => void
  questionType: 'mcq' | 'true_false' | 'free_response'
  path: string
}

export function AnswerSpecJsonEditor({ value, onChange, questionType }: AnswerSpecJsonEditorProps) {
  const [validationErrors, setValidationErrors] = useState<EditorError[]>([])

  // Validate on change (debounced)
  const validateAnswerSpec = useCallback((spec: AnswerSpec) => {
    const result = AnswerSpecSchema.safeParse(spec)
    if (!result.success) {
      setValidationErrors(zodErrorsToEditorErrors(result.error))
    } else {
      setValidationErrors([])
    }
  }, [])

  const handleChange = useCallback(
    (newSpec: AnswerSpec) => {
      onChange(newSpec)
      // Debounced validation
      const timeout = setTimeout(() => validateAnswerSpec(newSpec), 500)
      return () => clearTimeout(timeout)
    },
    [onChange, validateAnswerSpec],
  )

  // Check for questionType mismatch
  const hasQuestionTypeMismatch = value.questionType !== questionType

  // Auto-convert when questionType changes
  React.useEffect(() => {
    if (hasQuestionTypeMismatch) {
      // Prompt user to convert
      const shouldConvert = window.confirm(
        `The Question Type field has been changed to "${questionType}" but the answer spec is still set to "${value.questionType}". Would you like to auto-convert the answer spec to match? (This will reset the answer configuration)`,
      )

      if (shouldConvert) {
        let newSpec: AnswerSpec
        switch (questionType) {
          case 'mcq':
            newSpec = {
              questionType: 'mcq',
              multiSelect: false,
              options: [
                {
                  id: 'opt1',
                  content: [
                    { id: 't1', type: 'rich_text', format: 'md-math-v1', value: 'Option A' },
                  ],
                },
                {
                  id: 'opt2',
                  content: [
                    { id: 't2', type: 'rich_text', format: 'md-math-v1', value: 'Option B' },
                  ],
                },
              ],
              correctOptionIds: ['opt1'],
            }
            break
          case 'true_false':
            newSpec = {
              questionType: 'true_false',
              correct: true,
            }
            break
          case 'free_response':
            newSpec = {
              questionType: 'free_response',
              responseKind: 'numeric',
              acceptedAnswers: [''],
              tolerance: 0,
            }
            break
        }
        handleChange(newSpec)
      }
    }
  }, [questionType, value.questionType, hasQuestionTypeMismatch, handleChange])

  // Render appropriate editor
  const renderEditor = () => {
    const commonProps = {
      value,
      onChange: handleChange,
      questionType,
      errors: validationErrors,
    }

    // If there's a mismatch, show error
    if (hasQuestionTypeMismatch) {
      return (
        <div className="field-error" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: '500', marginBottom: '0.5rem' }}>Question Type Mismatch</h3>
          <p>
            The Question Type field is set to <strong>{questionType}</strong> but the answer spec
            has questionType <strong>{value.questionType}</strong>. Please reload the page or
            manually fix this mismatch.
          </p>
        </div>
      )
    }

    switch (value.questionType) {
      case 'mcq':
        return <McqAnswerEditor {...commonProps} />
      case 'true_false':
        return <TrueFalseAnswerEditor {...commonProps} />
      case 'free_response':
        return <FreeResponseAnswerEditor {...commonProps} />
      default:
        return (
          <div className="field-error" style={{ padding: '0.75rem' }}>
            Unknown question type: {(value as any).questionType}
          </div>
        )
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h3>Answer Specification</h3>
        <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
          Question Type: <strong>{questionType}</strong>
        </div>
      </div>

      <ErrorDisplay errors={validationErrors.filter((e) => !e.path.includes('.'))} />

      {renderEditor()}

      {/* Advanced JSON Panel */}
      <AdvancedJsonPanel
        value={value}
        onChange={(newValue) => handleChange(newValue as AnswerSpec)}
        label="Advanced: Answer Spec JSON"
      />
    </div>
  )
}

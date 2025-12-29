'use client'

/**
 * Rich Text Block Editor - Math-aware Markdown
 */

import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { RichTextBlock } from '@/contracts'
import type { BlockEditorProps } from '../shared/types'
import { ErrorDisplay } from '../shared/ErrorDisplay'
import 'katex/dist/katex.min.css'

export function RichTextBlockEditor({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  errors,
}: BlockEditorProps<RichTextBlock>) {
  const [value, setValue] = useState(block.value)

  // Debounced onChange
  const debouncedOnChange = useMemo(() => {
    let timeout: NodeJS.Timeout
    return (newValue: string) => {
      setValue(newValue)
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        onChange({ ...block, value: newValue })
      }, 300)
    }
  }, [block, onChange])

  return (
    <div
      style={{
        marginTop: '1rem',
        padding: '1rem',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h4>Rich Text (Math-aware Markdown)</h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="btn btn--style-secondary btn--size-small"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="btn btn--style-secondary btn--size-small"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn btn--style-secondary btn--size-small"
          >
            Delete
          </button>
        </div>
      </div>

      <ErrorDisplay errors={errors} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Editor */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
            Editor
          </label>
          <textarea
            value={value}
            onChange={(e) => debouncedOnChange(e.target.value)}
            style={{
              width: '100%',
              height: '16rem',
              padding: '0.75rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}
            placeholder="Type markdown here. Use $ for inline math: $x^2$ or $$ for block math:&#10;$$&#10;\\frac{1}{2}&#10;$$"
            spellCheck={false}
          />
          <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.7 }}>
            Use <code>$...$</code> for inline math and <code>$$...$$</code> for block math
          </p>
        </div>

        {/* Preview */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
            Preview
          </label>
          <div
            style={{
              height: '16rem',
              padding: '0.75rem',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {value || '*Empty*'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

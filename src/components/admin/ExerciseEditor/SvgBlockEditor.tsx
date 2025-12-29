'use client'

/**
 * SVG Block Editor
 */

import React, { useState, useMemo } from 'react'
import type { SvgBlock } from '@/contracts'
import type { BlockEditorProps } from '../shared/types'
import { ErrorDisplay } from '../shared/ErrorDisplay'

export function SvgBlockEditor({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  errors,
}: BlockEditorProps<SvgBlock>) {
  const [svg, setSvg] = useState(block.svg)

  // Debounced onChange
  const debouncedOnChange = useMemo(() => {
    let timeout: NodeJS.Timeout
    return (newSvg: string) => {
      setSvg(newSvg)
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        onChange({ ...block, svg: newSvg })
      }, 300)
    }
  }, [block, onChange])

  // Basic SVG sanitization (just check if it looks like SVG)
  const isSvgValid = svg.trim().toLowerCase().includes('<svg')

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
        <h4>SVG</h4>
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
            SVG Code
          </label>
          <textarea
            value={svg}
            onChange={(e) => debouncedOnChange(e.target.value)}
            style={{
              width: '100%',
              height: '16rem',
              padding: '0.75rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}
            placeholder="Paste SVG code here..."
            spellCheck={false}
          />
          <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.7 }}>
            Paste your SVG code (must start with &lt;svg&gt;)
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSvgValid ? (
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <p style={{ fontSize: '0.875rem', opacity: 0.7, fontStyle: 'italic' }}>
                {svg ? 'Invalid SVG (must start with <svg>)' : 'No SVG code'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

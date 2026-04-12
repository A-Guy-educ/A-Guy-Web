'use client'

import type { LatexBlock } from '@/server/payload/collections/Exercises/types'
import React from 'react'

interface LatexBlockEditorProps {
  block: LatexBlock
  onChange: (block: LatexBlock) => void
}

export const LatexBlockEditor: React.FC<LatexBlockEditorProps> = ({ block, onChange }) => {
  const handleLatexChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...block, latex: e.target.value })
  }

  const handleRenderModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...block, renderMode: e.target.value as 'block' | 'inline' })
  }

  const renderMode = block.renderMode ?? 'block'

  return (
    <div className="latex-block-editor">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: 500 }}>Render Mode:</label>
        <select
          value={renderMode}
          onChange={handleRenderModeChange}
          style={{ fontSize: '13px', padding: '2px 6px' }}
        >
          <option value="block">Block (display math)</option>
          <option value="inline">Inline</option>
        </select>
      </div>

      <textarea
        className="html-block-source-textarea"
        value={block.latex}
        onChange={handleLatexChange}
        placeholder="Enter LaTeX code here..."
        rows={8}
        style={{ fontFamily: 'monospace' }}
      />
    </div>
  )
}

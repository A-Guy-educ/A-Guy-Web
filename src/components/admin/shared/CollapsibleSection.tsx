'use client'

/**
 * Collapsible section for advanced/debug panels
 */

import React, { useState } from 'react'

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  className?: string
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  className = '',
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className={className} style={{ marginTop: '1rem' }}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="btn btn--style-secondary btn--size-small"
        style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}
      >
        <span>{title}</span>
        <span
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        >
          ▼
        </span>
      </button>
      {isExpanded && <div style={{ marginTop: '0.75rem' }}>{children}</div>}
    </div>
  )
}

'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { Block } from '@/contracts/exercise/content'
import { findBlockById, findBlockPath } from './utils'

interface BreadcrumbProps {
  blocks: Block[]
  selectedBlockId: string | null
  onNavigate: (blockId: string) => void
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ blocks, selectedBlockId, onNavigate }) => {
  if (!selectedBlockId) {
    return (
      <div className="breadcrumb">
        <span className="breadcrumb__item breadcrumb__item--inactive">Exercise</span>
      </div>
    )
  }

  const path = findBlockPath(blocks, selectedBlockId)
  const pathBlocks = path.map((id) => findBlockById(blocks, id)).filter(Boolean) as Block[]

  if (pathBlocks.length === 0) {
    return (
      <div className="breadcrumb">
        <span className="breadcrumb__item breadcrumb__item--inactive">Exercise</span>
      </div>
    )
  }

  return (
    <div className="breadcrumb">
      <span className="breadcrumb__item breadcrumb__item--inactive">Exercise</span>
      {pathBlocks.map((block, index) => {
        const isLast = index === pathBlocks.length - 1
        const displayText =
          block.type === 'container'
            ? block.title || 'Untitled Container'
            : block.type === 'rich_text'
              ? block.value.substring(0, 20).trim() || 'Rich Text'
              : 'Block'

        return (
          <React.Fragment key={block.id}>
            <ChevronRight size={12} className="breadcrumb__separator" />
            {isLast ? (
              <span className="breadcrumb__item breadcrumb__item--active">{displayText}</span>
            ) : (
              <button
                className="breadcrumb__item breadcrumb__item--clickable"
                onClick={() => onNavigate(block.id)}
              >
                {displayText}
              </button>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

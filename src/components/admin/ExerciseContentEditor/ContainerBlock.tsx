'use client'

import React from 'react'
import { Folder, ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import type { ContainerBlock as ContainerBlockType } from '@/contracts/exercise/content'

interface ContainerBlockProps {
  block: ContainerBlockType
  level: number // 0, 1, or 2 (max depth)
  path: string[] // Array of block IDs from root
  isSelected: boolean
  isCollapsed: boolean
  onSelect: (blockId: string) => void
  onToggleCollapse: (blockId: string) => void
  onAddChild: (parentId: string, blockType: 'container' | 'rich_text') => void
  onAddSibling: (siblingId: string, blockType: 'container' | 'rich_text') => void
  onDelete: (blockId: string) => void
  onUpdate: (blockId: string, updates: Partial<ContainerBlockType>) => void
  onMove: (blockId: string, direction: 'up' | 'down') => void
  canMoveUp: boolean
  canMoveDown: boolean
  children: React.ReactNode // Rendered child blocks
}

export const ContainerBlock: React.FC<ContainerBlockProps> = ({
  block,
  level,
  path,
  isSelected,
  isCollapsed,
  onSelect,
  onToggleCollapse,
  onAddChild,
  onAddSibling,
  onDelete,
  onUpdate,
  onMove,
  canMoveUp,
  canMoveDown,
  children,
}) => {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleValue, setTitleValue] = React.useState(block.title || '')

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
    onUpdate(block.id, { title: titleValue || undefined })
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleBlur()
    }
    if (e.key === 'Escape') {
      setTitleValue(block.title || '')
      setIsEditingTitle(false)
    }
  }

  const maxDepthReached = level >= 2

  return (
    <div
      className={`container-block ${isSelected ? 'block--selected' : ''}`}
      style={{ paddingLeft: `${level * 24}px` }}
      onClick={(e) => {
        // Don't select if clicking on interactive elements
        if ((e.target as HTMLElement).closest('button, input')) return
        onSelect(block.id)
      }}
    >
      <div className="container-block__header">
        <div className="container-block__header-left">
          <button
            className="icon-button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse(block.id)
            }}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          <Folder size={14} className="container-block__icon" />
          {isEditingTitle ? (
            <input
              type="text"
              className="container-block__title-input"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Container title..."
              autoFocus
            />
          ) : (
            <span
              className="container-block__title"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditingTitle(true)
              }}
            >
              {block.title || 'Untitled Container'}
            </span>
          )}
        </div>

        <div className="container-block__actions">
          <div className="container-block__action-group">
            <button
              className="icon-button"
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(block.id, 'rich_text')
              }}
              title="Add Rich Text Inside"
            >
              <Plus size={14} />
            </button>
            {!maxDepthReached && (
              <button
                className="icon-button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddChild(block.id, 'container')
                }}
                title="Add Container Inside"
              >
                <Plus size={14} />
                <Folder size={10} style={{ marginLeft: '2px' }} />
              </button>
            )}
          </div>
          <div className="container-block__action-group">
            <button
              className="icon-button"
              onClick={(e) => {
                e.stopPropagation()
                onAddSibling(block.id, 'rich_text')
              }}
              title="Add Rich Text Below"
            >
              <Plus size={14} />
            </button>
            {!maxDepthReached && (
              <button
                className="icon-button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddSibling(block.id, 'container')
                }}
                title="Add Container Below"
              >
                <Plus size={14} />
                <Folder size={10} style={{ marginLeft: '2px' }} />
              </button>
            )}
          </div>
          <div className="container-block__action-group">
            <button
              className="icon-button"
              onClick={(e) => {
                e.stopPropagation()
                onMove(block.id, 'up')
              }}
              disabled={!canMoveUp}
              title="Move Up"
            >
              <ArrowUp size={14} />
            </button>
            <button
              className="icon-button"
              onClick={(e) => {
                e.stopPropagation()
                onMove(block.id, 'down')
              }}
              disabled={!canMoveDown}
              title="Move Down"
            >
              <ArrowDown size={14} />
            </button>
          </div>
          <button
            className="icon-button delete"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Delete this container and all its children?')) {
                onDelete(block.id)
              }
            }}
            title="Delete Container"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="container-block__body">
          <div className="container-block__rail" />
          <div className="container-block__children">{children}</div>
        </div>
      )}
    </div>
  )
}

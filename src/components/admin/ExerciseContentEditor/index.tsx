'use client'

import React from 'react'
import { useField } from '@payloadcms/ui'
import { Code } from 'lucide-react'
import { BlockTree } from './BlockTree'
import { Breadcrumb } from './Breadcrumb'
import { JSONInspector } from './JSONInspector'
import { migrateV1ToV2 } from '@/contracts/exercise/content'
import type { Block } from '@/contracts/exercise/content'
import {
  generateId,
  addBlockAsChild,
  addBlockAsSibling,
  removeBlock,
  updateBlock,
  moveBlockInParent,
  findBlockById,
} from './utils'
import './index.css'

const DEFAULT_STEM: Block[] = [
  {
    id: 'container-1',
    type: 'container',
    title: 'Section 1',
    children: [
      {
        id: 'block-1',
        type: 'rich_text',
        format: 'md-math-v1',
        value: '# Write your question here\n\nExample: Solve for $x$: $2x+3=11$',
      },
    ],
  },
]

export const ExerciseContentEditor: React.FC<{ path: string }> = ({ path }) => {
  const { value, setValue } = useField<any>({ path })
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const [collapsedBlockIds, setCollapsedBlockIds] = React.useState<Set<string>>(new Set())
  const [isJsonPanelOpen, setIsJsonPanelOpen] = React.useState(false)
  const [jsonPanelWidth, setJsonPanelWidth] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('exercise-editor-json-panel-width')
      return saved ? parseInt(saved, 10) : 400
    }
    return 400
  })
  const [isResizing, setIsResizing] = React.useState(false)
  const [lastUpdatedBy, setLastUpdatedBy] = React.useState<'richText' | 'jsonEditor' | null>(null)
  const [mobileView, setMobileView] = React.useState<'editor' | 'json'>('editor')
  const [isMobile, setIsMobile] = React.useState(false)

  // Detect mobile viewport
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Ensure valid structure on load and migrate v1 to v2
  React.useEffect(() => {
    if (!value || !value.stem || !Array.isArray(value.stem)) {
      setValue({
        contentSchemaVersion: 2,
        stem: DEFAULT_STEM,
      })
      return
    }

    // Migrate v1 to v2 if needed
    if (value.contentSchemaVersion === 1) {
      const migrated = migrateV1ToV2(value)
      setValue(migrated)
    }
  }, [value, setValue])

  const handleSelectBlock = (blockId: string) => {
    setSelectedBlockId(blockId)
  }

  const handleToggleCollapse = (blockId: string) => {
    setCollapsedBlockIds((prev) => {
      const next = new Set(prev)
      if (next.has(blockId)) {
        next.delete(blockId)
      } else {
        next.add(blockId)
      }
      return next
    })
  }

  const handleAddBlock = (
    parentId: string | null,
    blockType: 'container' | 'rich_text',
    position: 'inside' | 'below',
  ) => {
    if (!value || !value.stem) return

    const newBlock: Block =
      blockType === 'container'
        ? {
            id: generateId(),
            type: 'container',
            title: 'New Container',
            children: [],
          }
        : {
            id: generateId(),
            type: 'rich_text',
            format: 'md-math-v1',
            value: '',
          }

    let updatedStem: Block[]
    if (position === 'inside' && parentId) {
      updatedStem = addBlockAsChild(parentId, newBlock, value.stem)
    } else if (position === 'below' && parentId) {
      updatedStem = addBlockAsSibling(parentId, newBlock, value.stem)
    } else {
      // Add at root level
      updatedStem = [...value.stem, newBlock]
    }

    setValue({
      ...value,
      stem: updatedStem,
    })
    setSelectedBlockId(newBlock.id)
  }

  const handleDeleteBlock = (blockId: string) => {
    if (!value || !value.stem) return

    const updatedStem = removeBlock(blockId, value.stem)
    setValue({
      ...value,
      stem: updatedStem,
    })

    // Clear selection if deleted block was selected
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }
  }

  const handleUpdateBlock = (blockId: string, updates: Partial<Block>) => {
    if (!value || !value.stem) return

    // Prevent update loops - if JSON editor just updated, don't trigger from rich text
    if (lastUpdatedBy === 'jsonEditor') {
      return
    }

    // Set flag to indicate rich text is updating
    setLastUpdatedBy('richText')

    const updatedStem = updateBlock(blockId, updates, value.stem)
    setValue({
      ...value,
      stem: updatedStem,
    })

    // Clear flag after a short delay
    setTimeout(() => {
      setLastUpdatedBy(null)
    }, 100)
  }

  const handleJsonApply = (updatedBlock: Block) => {
    if (!selectedBlockId || !value || !value.stem) return

    // Prevent update loops - if rich text just updated, don't trigger from JSON
    if (lastUpdatedBy === 'richText') {
      return
    }

    // Set flag to indicate JSON editor is updating
    setLastUpdatedBy('jsonEditor')

    const updatedStem = updateBlock(selectedBlockId, updatedBlock, value.stem)
    setValue({
      ...value,
      stem: updatedStem,
    })

    // Clear flag after a short delay
    setTimeout(() => {
      setLastUpdatedBy(null)
    }, 100)
  }

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    if (!value || !value.stem) return

    const updatedStem = moveBlockInParent(blockId, direction, value.stem)
    setValue({
      ...value,
      stem: updatedStem,
    })
  }

  // Handle resizing
  React.useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.editor-layout') as HTMLElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const newWidth = containerRect.right - e.clientX
      const minWidth = 300
      const maxWidth = containerRect.width * 0.5

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setJsonPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      if (typeof window !== 'undefined') {
        localStorage.setItem('exercise-editor-json-panel-width', jsonPanelWidth.toString())
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, jsonPanelWidth])

  const selectedBlock = selectedBlockId ? findBlockById(value?.stem || [], selectedBlockId) : null

  if (!value || !value.stem) {
    return <div className="p-4 text-muted-foreground">Loading editor...</div>
  }

  return (
    <div className="exercise-content-editor">
      <div className="editor-header">
        <div>
          <h3>Exercise Content</h3>
          <p className="editor-description">
            Add and arrange content blocks hierarchically. Supports containers and rich text with
            Markdown and LaTeX math.
          </p>
        </div>
        <div className="editor-header-actions">
          <button
            className={`icon-button ${isJsonPanelOpen ? 'active' : ''}`}
            onClick={() => setIsJsonPanelOpen(!isJsonPanelOpen)}
            title={isJsonPanelOpen ? 'Hide JSON' : 'Show JSON'}
          >
            <Code size={16} />
          </button>
          <div className="editor-badge">Blocks V2</div>
        </div>
      </div>

      {selectedBlockId && (
        <div className="editor-breadcrumb">
          <Breadcrumb
            blocks={value.stem}
            selectedBlockId={selectedBlockId}
            onNavigate={handleSelectBlock}
          />
        </div>
      )}

      {isMobile ? (
        <>
          <div className="editor-mobile-tabs">
            <button
              className={`editor-mobile-tab ${mobileView === 'editor' ? 'active' : ''}`}
              onClick={() => setMobileView('editor')}
            >
              Editor
            </button>
            <button
              className={`editor-mobile-tab ${mobileView === 'json' ? 'active' : ''}`}
              onClick={() => setMobileView('json')}
            >
              JSON
            </button>
          </div>
          {mobileView === 'editor' ? (
            <div className="editor-main">
              <BlockTree
                blocks={value.stem}
                selectedBlockId={selectedBlockId}
                collapsedBlockIds={collapsedBlockIds}
                onSelect={handleSelectBlock}
                onToggleCollapse={handleToggleCollapse}
                onAddBlock={handleAddBlock}
                onDeleteBlock={handleDeleteBlock}
                onUpdateBlock={handleUpdateBlock}
                onMoveBlock={handleMoveBlock}
              />
            </div>
          ) : (
            <div className="editor-json-panel editor-json-panel--mobile">
              <JSONInspector
                block={selectedBlock}
                mode="edit"
                onApply={handleJsonApply}
                onClose={() => setMobileView('editor')}
              />
            </div>
          )}
        </>
      ) : (
        <div className="editor-layout">
          <div className="editor-main">
            <BlockTree
              blocks={value.stem}
              selectedBlockId={selectedBlockId}
              collapsedBlockIds={collapsedBlockIds}
              onSelect={handleSelectBlock}
              onToggleCollapse={handleToggleCollapse}
              onAddBlock={handleAddBlock}
              onDeleteBlock={handleDeleteBlock}
              onUpdateBlock={handleUpdateBlock}
              onMoveBlock={handleMoveBlock}
            />
          </div>

          {isJsonPanelOpen && (
            <>
              <div
                className="editor-splitter"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsResizing(true)
                }}
              />
              <div className="editor-json-panel" style={{ width: `${jsonPanelWidth}px` }}>
                <JSONInspector block={selectedBlock} mode="edit" onApply={handleJsonApply} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

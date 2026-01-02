'use client'

import React from 'react'
import { Type, Folder } from 'lucide-react'
import type {
  Block,
  ContainerBlock as ContainerBlockType,
  RichTextBlock,
} from '@/contracts/exercise/content'
import { ContainerBlock } from './ContainerBlock'
import { BlockCard } from './BlockCard'

interface BlockTreeProps {
  blocks: Block[]
  selectedBlockId: string | null
  collapsedBlockIds: Set<string>
  onSelect: (blockId: string) => void
  onToggleCollapse: (blockId: string) => void
  onAddBlock: (
    parentId: string | null,
    blockType: 'container' | 'rich_text',
    position: 'inside' | 'below',
  ) => void
  onDeleteBlock: (blockId: string) => void
  onUpdateBlock: (blockId: string, updates: Partial<Block>) => void
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void
}

interface BlockTreeNodeProps {
  block: Block
  level: number
  path: string[]
  selectedBlockId: string | null
  collapsedBlockIds: Set<string>
  onSelect: (blockId: string) => void
  onToggleCollapse: (blockId: string) => void
  onAddBlock: (
    parentId: string | null,
    blockType: 'container' | 'rich_text',
    position: 'inside' | 'below',
  ) => void
  onDeleteBlock: (blockId: string) => void
  onUpdateBlock: (blockId: string, updates: Partial<Block>) => void
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void
  siblings: Block[]
  index: number
}

const BlockTreeNode: React.FC<BlockTreeNodeProps> = ({
  block,
  level,
  path,
  selectedBlockId,
  collapsedBlockIds,
  onSelect,
  onToggleCollapse,
  onAddBlock,
  onDeleteBlock,
  onUpdateBlock,
  onMoveBlock,
  siblings,
  index,
}) => {
  const isSelected = block.id === selectedBlockId
  const isCollapsed = collapsedBlockIds.has(block.id)

  if (block.type === 'container') {
    const containerBlock = block as ContainerBlockType
    const canMoveUp = index > 0
    const canMoveDown = index < siblings.length - 1

    const handleAddChild = (parentId: string, blockType: 'container' | 'rich_text') => {
      onAddBlock(parentId, blockType, 'inside')
    }

    const handleAddSibling = (siblingId: string, blockType: 'container' | 'rich_text') => {
      onAddBlock(siblingId, blockType, 'below')
    }

    const handleDelete = (blockId: string) => {
      onDeleteBlock(blockId)
    }

    const handleUpdate = (blockId: string, updates: Partial<ContainerBlockType>) => {
      onUpdateBlock(blockId, updates)
    }

    const handleMove = (blockId: string, direction: 'up' | 'down') => {
      onMoveBlock(blockId, direction)
    }

    return (
      <ContainerBlock
        block={containerBlock}
        level={level}
        path={path}
        isSelected={isSelected}
        isCollapsed={isCollapsed}
        onSelect={onSelect}
        onToggleCollapse={onToggleCollapse}
        onAddChild={handleAddChild}
        onAddSibling={handleAddSibling}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onMove={handleMove}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      >
        {!isCollapsed &&
          containerBlock.children.map((child, childIndex) => (
            <BlockTreeNode
              key={child.id}
              block={child}
              level={level + 1}
              path={[...path, child.id]}
              selectedBlockId={selectedBlockId}
              collapsedBlockIds={collapsedBlockIds}
              onSelect={onSelect}
              onToggleCollapse={onToggleCollapse}
              onAddBlock={onAddBlock}
              onDeleteBlock={onDeleteBlock}
              onUpdateBlock={onUpdateBlock}
              onMoveBlock={onMoveBlock}
              siblings={containerBlock.children}
              index={childIndex}
            />
          ))}
      </ContainerBlock>
    )
  } else {
    // RichTextBlock
    const richTextBlock = block as RichTextBlock
    const canMoveUp = index > 0
    const canMoveDown = index < siblings.length - 1

    return (
      <div
        className={`block-card-wrapper block-card-wrapper--level-${level} ${isSelected ? 'block--selected' : ''}`}
        onClick={() => onSelect(block.id)}
      >
        <BlockCard
          block={richTextBlock}
          index={index}
          total={siblings.length}
          onChange={(updates) => onUpdateBlock(block.id, updates)}
          onDelete={() => onDeleteBlock(block.id)}
          onMoveUp={() => canMoveUp && onMoveBlock(block.id, 'up')}
          onMoveDown={() => canMoveDown && onMoveBlock(block.id, 'down')}
        />
      </div>
    )
  }
}

export const BlockTree: React.FC<BlockTreeProps> = ({
  blocks,
  selectedBlockId,
  collapsedBlockIds,
  onSelect,
  onToggleCollapse,
  onAddBlock,
  onDeleteBlock,
  onUpdateBlock,
  onMoveBlock,
}) => {
  return (
    <div className="block-tree">
      {blocks.length === 0 ? (
        <div className="block-tree__empty">
          <p>No blocks yet. Add your first block below.</p>
        </div>
      ) : (
        blocks.map((block, index) => (
          <BlockTreeNode
            key={block.id}
            block={block}
            level={0}
            path={[block.id]}
            selectedBlockId={selectedBlockId}
            collapsedBlockIds={collapsedBlockIds}
            onSelect={onSelect}
            onToggleCollapse={onToggleCollapse}
            onAddBlock={onAddBlock}
            onDeleteBlock={onDeleteBlock}
            onUpdateBlock={onUpdateBlock}
            onMoveBlock={onMoveBlock}
            siblings={blocks}
            index={index}
          />
        ))
      )}
      <div className="block-tree__add-root">
        <button
          className="block-tree__add-button block-tree__add-button--text"
          onClick={() => onAddBlock(null, 'rich_text', 'below')}
          title="Add Rich Text Block"
        >
          <Type size={16} />
          <span>Add Rich Text</span>
        </button>
        <button
          className="block-tree__add-button block-tree__add-button--container"
          onClick={() => onAddBlock(null, 'container', 'below')}
          title="Add Container"
        >
          <Folder size={16} />
          <span>Add Container</span>
        </button>
      </div>
    </div>
  )
}

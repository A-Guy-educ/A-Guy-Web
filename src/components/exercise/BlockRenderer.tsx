import React from 'react'
import { RichTextBlock } from './RichTextBlock'
import type { Block, ContainerBlock } from '@/contracts/exercise/content'

interface BlockRendererProps {
  block: Block
  depth: number
}

export function BlockRenderer({ block, depth }: BlockRendererProps) {
  // Handle rich_text blocks
  if (block.type === 'rich_text') {
    return (
      <div
        className={`block-item ${depth > 0 ? 'ml-6 pl-4 border-l-2 border-slate-200' : ''}`}
        style={{ marginBottom: depth === 0 ? '1.5rem' : '1rem' }}
      >
        <RichTextBlock content={block.value} format={block.format} />
      </div>
    )
  }

  // Handle container blocks (recursive)
  if (block.type === 'container') {
    const containerBlock = block as ContainerBlock
    return (
      <div
        className={`section-block ${depth > 0 ? 'ml-6 pl-4 border-l-2 border-blue-200' : ''}`}
        style={{ marginBottom: '1.5rem' }}
      >
        {containerBlock.title && (
          <h3 className="text-lg font-semibold mb-3 text-slate-900">{containerBlock.title}</h3>
        )}
        <div className="space-y-3">
          {containerBlock.children?.map((childBlock: Block, index: number) => (
            <BlockRenderer key={childBlock.id || index} block={childBlock} depth={depth + 1} />
          ))}
        </div>
      </div>
    )
  }

  // Unsupported block type fallback
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
      <span className="font-mono">Unsupported block type: {(block as any).type}</span>
    </div>
  )
}

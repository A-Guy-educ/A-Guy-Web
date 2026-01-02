import type { Block, ContainerBlock } from '@/contracts/exercise/content'

export const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'b-' + Math.random().toString(36).substr(2, 9)
}

/**
 * Find a block by ID in the tree (recursive search)
 */
export function findBlockById(tree: Block[], id: string): Block | null {
  for (const block of tree) {
    if (block.id === id) {
      return block
    }
    if (block.type === 'container') {
      const found = findBlockById(block.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Find the path (array of IDs) from root to the block
 */
export function findBlockPath(tree: Block[], id: string): string[] {
  for (const block of tree) {
    if (block.id === id) {
      return [block.id]
    }
    if (block.type === 'container') {
      const childPath = findBlockPath(block.children, id)
      if (childPath.length > 0) {
        return [block.id, ...childPath]
      }
    }
  }
  return []
}

/**
 * Get the nesting depth of a block (0 = root level)
 */
export function getBlockDepth(tree: Block[], id: string): number {
  const path = findBlockPath(tree, id)
  return path.length > 0 ? path.length - 1 : -1
}

/**
 * Validate that tree doesn't exceed max depth
 */
export function validateMaxDepth(tree: Block[], maxDepth: number = 3): boolean {
  function checkDepth(blocks: Block[], currentDepth: number): boolean {
    if (currentDepth > maxDepth) return false
    for (const block of blocks) {
      if (block.type === 'container') {
        if (!checkDepth(block.children, currentDepth + 1)) {
          return false
        }
      }
    }
    return true
  }
  return checkDepth(tree, 0)
}

/**
 * Flatten all blocks in depth-first order
 */
export function flattenBlocks(tree: Block[]): Block[] {
  const result: Block[] = []
  for (const block of tree) {
    result.push(block)
    if (block.type === 'container') {
      result.push(...flattenBlocks(block.children))
    }
  }
  return result
}

/**
 * Find the parent container of a block
 */
export function getBlockParent(tree: Block[], childId: string): ContainerBlock | null {
  for (const block of tree) {
    if (block.type === 'container') {
      // Check if child is direct child of this container
      if (block.children.some((child) => child.id === childId)) {
        return block
      }
      // Recursively check children
      const parent = getBlockParent(block.children, childId)
      if (parent) return parent
    }
  }
  return null
}

/**
 * Add a block as a child of a container
 */
export function addBlockAsChild(parentId: string, newBlock: Block, tree: Block[]): Block[] {
  return tree.map((block) => {
    if (block.id === parentId && block.type === 'container') {
      return {
        ...block,
        children: [...block.children, newBlock],
      }
    }
    if (block.type === 'container') {
      return {
        ...block,
        children: addBlockAsChild(parentId, newBlock, block.children),
      }
    }
    return block
  })
}

/**
 * Add a block as a sibling (at the same level)
 */
export function addBlockAsSibling(siblingId: string, newBlock: Block, tree: Block[]): Block[] {
  // Find the index of the sibling
  const siblingIndex = tree.findIndex((block) => block.id === siblingId)
  if (siblingIndex !== -1) {
    const newTree = [...tree]
    newTree.splice(siblingIndex + 1, 0, newBlock)
    return newTree
  }

  // If not found at root level, search in containers
  return tree.map((block) => {
    if (block.type === 'container') {
      return {
        ...block,
        children: addBlockAsSibling(siblingId, newBlock, block.children),
      }
    }
    return block
  })
}

/**
 * Remove a block and all its children
 */
export function removeBlock(blockId: string, tree: Block[]): Block[] {
  return tree
    .filter((block) => block.id !== blockId)
    .map((block) => {
      if (block.type === 'container') {
        return {
          ...block,
          children: removeBlock(blockId, block.children),
        }
      }
      return block
    })
}

/**
 * Move a block within the same level (reorder)
 */
export function moveBlock(blockId: string, targetIndex: number, tree: Block[]): Block[] {
  // Find the block and its current index
  const currentIndex = tree.findIndex((block) => block.id === blockId)
  if (currentIndex === -1) {
    // Block not found at this level, search in containers
    return tree.map((block) => {
      if (block.type === 'container') {
        return {
          ...block,
          children: moveBlock(blockId, targetIndex, block.children),
        }
      }
      return block
    })
  }

  // Move within same level
  const newTree = [...tree]
  const [movedBlock] = newTree.splice(currentIndex, 1)
  newTree.splice(targetIndex, 0, movedBlock)
  return newTree
}

/**
 * Move a block within its parent's children array (for nested moves)
 */
export function moveBlockInParent(
  blockId: string,
  direction: 'up' | 'down',
  tree: Block[],
): Block[] {
  // Find parent container
  const parent = getBlockParent(tree, blockId)
  if (!parent) {
    // Block is at root level, use regular moveBlock
    const currentIndex = tree.findIndex((block) => block.id === blockId)
    if (currentIndex === -1) return tree

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= tree.length) return tree

    return moveBlock(blockId, targetIndex, tree)
  }

  // Find block in parent's children
  const childIndex = parent.children.findIndex((child) => child.id === blockId)
  if (childIndex === -1) return tree

  const targetIndex = direction === 'up' ? childIndex - 1 : childIndex + 1
  if (targetIndex < 0 || targetIndex >= parent.children.length) return tree

  // Update parent's children
  return tree.map((block) => {
    if (block.id === parent.id && block.type === 'container') {
      const newChildren = [...block.children]
      const [movedBlock] = newChildren.splice(childIndex, 1)
      newChildren.splice(targetIndex, 0, movedBlock)
      return {
        ...block,
        children: newChildren,
      }
    }
    if (block.type === 'container') {
      return {
        ...block,
        children: moveBlockInParent(blockId, direction, block.children),
      }
    }
    return block
  })
}

/**
 * Update block properties
 */
export function updateBlock(blockId: string, updates: Partial<Block>, tree: Block[]): Block[] {
  return tree.map((block) => {
    if (block.id === blockId) {
      return { ...block, ...updates } as Block
    }
    if (block.type === 'container') {
      return {
        ...block,
        children: updateBlock(blockId, updates, block.children),
      } as ContainerBlock
    }
    return block
  })
}

/**
 * Validate block structure (depth, required fields, etc.)
 */
export function validateBlockStructure(
  block: Block,
  maxDepth: number,
): { valid: boolean; error?: string } {
  if (!block.id || typeof block.id !== 'string' || block.id.length === 0) {
    return { valid: false, error: 'Block must have a valid id' }
  }

  if (block.type === 'container') {
    if (!Array.isArray(block.children)) {
      return { valid: false, error: 'Container block must have children array' }
    }
    // Check depth recursively
    function checkDepth(blocks: Block[], depth: number): boolean {
      if (depth > maxDepth) return false
      for (const child of blocks) {
        if (child.type === 'container') {
          if (!checkDepth(child.children, depth + 1)) return false
        }
      }
      return true
    }
    if (!checkDepth(block.children, 1)) {
      return { valid: false, error: `Maximum depth of ${maxDepth} exceeded` }
    }
  } else if (block.type === 'rich_text') {
    if (typeof block.value !== 'string') {
      return { valid: false, error: 'Rich text block must have a string value' }
    }
    if (block.format !== 'md-math-v1') {
      return { valid: false, error: 'Rich text block must have format md-math-v1' }
    }
  }

  return { valid: true }
}
